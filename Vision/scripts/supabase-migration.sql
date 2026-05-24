-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT UNIQUE NOT NULL,
  nickname TEXT,
  coach_name TEXT NOT NULL,
  lob TEXT NOT NULL, -- Sales, Support, Specialty
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for staff
CREATE INDEX IF NOT EXISTS idx_staff_coach ON staff(coach_name);
CREATE INDEX IF NOT EXISTS idx_staff_lob ON staff(lob);
CREATE INDEX IF NOT EXISTS idx_staff_agent ON staff(agent_name);

-- Create observations table
CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  department TEXT[] NOT NULL,
  other_department TEXT,
  date DATE NOT NULL,
  session_type TEXT[] NOT NULL,
  categories TEXT[] NOT NULL,
  other_category TEXT,
  strengths TEXT,
  areas_of_opportunity TEXT,
  root_cause TEXT,
  action_plan TEXT,
  overall_rating TEXT[] NOT NULL,
  other_feedback TEXT,
  order_number TEXT,
  team_lead_feedback TEXT,
  rating INTEGER NOT NULL,
  observed_by TEXT NOT NULL,
  duration INTEGER, -- In seconds
  sync_id TEXT UNIQUE, -- For deduplication
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for observations
CREATE INDEX IF NOT EXISTS idx_obs_agent ON observations(agent_name);
CREATE INDEX IF NOT EXISTS idx_obs_coach ON observations(coach_name);
CREATE INDEX IF NOT EXISTS idx_obs_date ON observations(date);
CREATE INDEX IF NOT EXISTS idx_obs_sync_id ON observations(sync_id);

-- Create active_observations table
CREATE TABLE IF NOT EXISTS active_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  start_time BIGINT NOT NULL, -- timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for active_observations
CREATE INDEX IF NOT EXISTS idx_active_obs_agent ON active_observations(agent_name);
CREATE INDEX IF NOT EXISTS idx_active_obs_coach ON active_observations(coach_name);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT, -- Hash
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- admin, user
  timezone TEXT,
  avatar TEXT,
  default_view TEXT,
  security_question TEXT,
  security_answer TEXT,
  is_first_login BOOLEAN DEFAULT true,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create SLA Daily metrics table
CREATE TABLE IF NOT EXISTS intercom_sla_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  inbound_count INTEGER DEFAULT 0,
  sla_passes INTEGER DEFAULT 0,
  sla_fails INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sla_date ON intercom_sla_daily(date);

-- Advanced SLA Dashboard Support
CREATE TABLE IF NOT EXISTS ops_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL, -- Support, Sales, Service Recovery
  channel TEXT NOT NULL, -- Chat, Voice
  inbound_count INTEGER DEFAULT 0,
  passed_count INTEGER DEFAULT 0,
  abandoned_count INTEGER DEFAULT 0,
  wait_seconds INTEGER DEFAULT 0, -- Queue Time
  handle_seconds INTEGER DEFAULT 0, -- AHT (Calls)
  frt_seconds INTEGER DEFAULT 0,
  efficiency DECIMAL(10,2) DEFAULT 0, -- Keeping for legacy but we will display Abandon Rate
  absenteeism_pct INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department, channel, date)
);

CREATE TABLE IF NOT EXISTS absenteeism (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_absent INTEGER DEFAULT 0,
  global_pct INTEGER DEFAULT 0,
  date DATE UNIQUE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- mitigation, cause
  content TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_log_date ON ops_log(date);

CREATE TABLE IF NOT EXISTS email_productivity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_closed INTEGER DEFAULT 0,
  total_assigned INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  replies_sent INTEGER DEFAULT 0,
  top_agents JSONB DEFAULT '[]',
  date DATE UNIQUE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Function to atomically increment SLA metrics
CREATE OR REPLACE FUNCTION increment_sla_metrics(target_date DATE, is_pass BOOLEAN)
RETURNS void AS $$
BEGIN
  INSERT INTO intercom_sla_daily (date, inbound_count, sla_passes, sla_fails)
  VALUES (target_date, 1, CASE WHEN is_pass THEN 1 ELSE 0 END, CASE WHEN is_pass THEN 0 ELSE 1 END)
  ON CONFLICT (date) DO UPDATE SET
    inbound_count = intercom_sla_daily.inbound_count + 1,
    sla_passes = intercom_sla_daily.sla_passes + (CASE WHEN is_pass THEN 1 ELSE 0 END),
    sla_fails = intercom_sla_daily.sla_fails + (CASE WHEN is_pass THEN 0 ELSE 1 END),
    updated_at = now();
END;
-- Atomic update including Queue Time and Handle Time
CREATE OR REPLACE FUNCTION update_ops_metrics(
  p_dept TEXT,
  p_chan TEXT,
  p_date DATE,
  p_is_pass BOOLEAN,
  p_frt INTEGER,
  p_wait INTEGER DEFAULT 0,
  p_handle INTEGER DEFAULT 0,
  p_is_abandon BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
BEGIN
  INSERT INTO ops_metrics (department, channel, date, inbound_count, passed_count, abandoned_count, frt_seconds, wait_seconds, handle_seconds, updated_at)
  VALUES (p_dept, p_chan, p_date, 1, CASE WHEN p_is_pass THEN 1 ELSE 0 END, CASE WHEN p_is_abandon THEN 1 ELSE 0 END, p_frt, p_wait, p_handle, now())
  ON CONFLICT (department, channel, date) DO UPDATE SET
    inbound_count = ops_metrics.inbound_count + 1,
    passed_count = ops_metrics.passed_count + (CASE WHEN p_is_pass THEN 1 ELSE 0 END),
    abandoned_count = ops_metrics.abandoned_count + (CASE WHEN p_is_abandon THEN 1 ELSE 0 END),
    frt_seconds = ROUND((ops_metrics.frt_seconds + p_frt) / 2),
    wait_seconds = ROUND((ops_metrics.wait_seconds + p_wait) / 2),
    handle_seconds = ROUND((ops_metrics.handle_seconds + p_handle) / 2),
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE ops_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE absenteeism;
ALTER PUBLICATION supabase_realtime ADD TABLE ops_log;
ALTER PUBLICATION supabase_realtime ADD TABLE intercom_sla_daily;
