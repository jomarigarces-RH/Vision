import { supabaseAdmin as supabase } from "@/lib/supabase"; // server-only; bypasses RLS (users table stays private)
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.toLowerCase().trim();
  const type = searchParams.get("type");

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  try {
    if (type === "checkEmail") {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) throw error;
      if (!user) return NextResponse.json({ exists: false });
      if (user.is_revoked) return NextResponse.json({ error: "Access revoked" }, { status: 403 });

      return NextResponse.json({
        exists: true,
        name: user.name,
        role: user.role,
        isFirstLogin: user.is_first_login,
        securityQuestion: user.security_question,
        preferences: {
          timezone: user.timezone,
          avatar: user.avatar,
          defaultView: user.default_view,
        },
      });
    }

    if (type === "listUsers") {
      // Check if requester is admin
      const { data: requester, error: reqError } = await supabase
        .from("users")
        .select("role")
        .eq("email", email)
        .maybeSingle();
      
      if (reqError || requester?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      // Map to frontend keys
      const mapped = data.map((u: any) => ({
        ...u,
        _id: u.id,
        isFirstLogin: u.is_first_login,
        isRevoked: u.is_revoked,
        securityQuestion: u.security_question
      }));

      return NextResponse.json(mapped);
    }


    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, email, password, securityQuestion, securityAnswer, newPassword, ...updates } = body;
    const lowerEmail = email?.toLowerCase().trim();

    if (!lowerEmail) return NextResponse.json({ error: "Email required" }, { status: 400 });

    if (type === "register") {
      const { error } = await supabase
        .from("users")
        .update({
          password: password,
          security_question: securityQuestion,
          security_answer: securityAnswer?.toLowerCase().trim(),
          is_first_login: false,
        })
        .eq("email", lowerEmail);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === "login") {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", lowerEmail)
        .maybeSingle();

      if (error) throw error;
      if (!user || user.is_first_login) throw new Error("Invalid login");
      if (user.is_revoked) throw new Error("Access revoked");
      if (user.password !== password) throw new Error("Incorrect password");

      return NextResponse.json({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          preferences: {
            timezone: user.timezone,
            avatar: user.avatar,
            defaultView: user.default_view,
          },
        },
      });
    }

    if (type === "reset") {
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("security_answer, is_revoked")
        .eq("email", lowerEmail)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!user) throw new Error("User not found");
      if (user.is_revoked) throw new Error("Access revoked");
      if (user.security_answer !== securityAnswer?.toLowerCase().trim()) throw new Error("Incorrect security answer");

      const { error: updateError } = await supabase
        .from("users")
        .update({ password: newPassword })
        .eq("email", lowerEmail);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true });
    }

    if (type === "updateSettings") {
      // Map camelCase to snake_case for updates
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.timezone) dbUpdates.timezone = updates.timezone;
      if (updates.avatar) dbUpdates.avatar = updates.avatar;
      if (updates.defaultView) dbUpdates.default_view = updates.defaultView;
      if (updates.password) dbUpdates.password = updates.password;

      const { error } = await supabase
        .from("users")
        .update(dbUpdates)
        .eq("email", lowerEmail);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === "manageUser") {
      // Check if requester is admin
      const { data: requester, error: reqError } = await supabase
        .from("users")
        .select("role")
        .eq("email", lowerEmail)
        .maybeSingle();
      
      if (reqError || requester?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const { userId, action } = body;
      const dbUpdates: any = {};

      if (action === "revoke") dbUpdates.is_revoked = true;
      if (action === "restore") dbUpdates.is_revoked = false;
      if (action === "makeAdmin") dbUpdates.role = "admin";
      if (action === "setRole") dbUpdates.role = body.role; // Generic role setter
      if (action === "resetPassword") {
        dbUpdates.is_first_login = true;
        dbUpdates.password = null;
      }

      const { error } = await supabase
        .from("users")
        .update(dbUpdates)
        .eq("id", userId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }


    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
