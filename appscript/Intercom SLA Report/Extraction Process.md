How to extract data on the cards: 



first, here is the guide to identify if they are from Calls, Chats, as well as what LOB they are in, Support, Sales, or Service Recovery. 



Lob guide: Format is (LOB - Voice/Chat)


**Support:**

Pre-Delivery Support - Voice

Post - Delivery Support - Voice
Spanish Support - Voice
Pre-Delivery Support - Chat
Post - Delivery Support - Chat
Spanish Support - Chat

**Sales:**
Inbound Sales - Voice
Spanish Sales - Voice
Inbound Sales - Chat
Spanish Sales - Chat

**Service Recovery:** 
Service Recovery - Chat
Service Recovery - Voice

now those datas are found somewhere, its from this Drive links: 

note, inside these links are folders for dates, example: May 2026, so the system should connect to what date it is on the filtered date,  

Voice Metrics or folder name 00 Voice Metrics on the folder there is another folder, for month, then the files are in format of Voice Metrics - (DD/MM/YYY)
https://drive.google.com/drive/folders/1nCpKUUGt\_1Sb2yg-j7QcYDaDf\_5idvTc

files on this folder contains: 
LOB (Column A) The Lob Names
Inbound Calls (Column C) on Count data, gather the total

Abandoned Calls (Column D) on Count data, gather the total

Avg AHT (Column F) in Seconds, Translate to format mm:ss

Avg Call in Queue (Column G) in Seconds, Translate to format mm:ss

Missed Calls (Column H) on Count data, gather the total

AAT (Column I) in Seconds, Translate to format mm:ss

Avg Hold Time (Column J) in Seconds, Translate to format mm:ss

Chat SLA or 01 Chat SLA  on the folder there is another folder, for month, then the files are in format of Chat SLA - (DD/MM/YYY)
https://drive.google.com/drive/folders/1dIZhVKT5QmjMVL3yl5cZZJQQ5qu3LxC5

files on this folder contains:
LOB (Column A) The LOB
SLA (Column B) Just Filter out based on LOB Sales, Support, or Service Recovery and find average

Chat Inbound (Column C) on Count data, gather the total

FRT(First Response Time) (Column D) in Seconds, Translate to format mm:ss
AHT (Column E) in Seconds, Translate to format mm:ss

Chat in Queue Avg (Column F) in Seconds, Translate to format mm:ss

Voice SLA or 02 Voice SLA on drive on the folder there is another folder, for month, then the files are in format of Voice SLA - (DD/MM/YYY)
https://drive.google.com/drive/folders/1cI46hILQQb-g-8TfHgZQ6T1dhwtQun10

files on this folder contains:
Call queue time (Column B) - this is what matters here the most, the data here is in seconds, so if data of each row matching their LOB is 75 or more, then it failed SLA, if its below 75 it passed SLA, so it will total how many entries on the data passed filtered by LOB, then will divide it to the total inbound, which is the total entries regardless if it passed or not. that is the percentage for SLA


Team Currently assigned - this is the LOB where you can find the LOB corresponding to the dashboard. 

Email Productivity or 03 Email Productivity on drive, on the folder there is another folder, for month, then the files are in format of Email Productivity - (DD/MM/YYY)
https://drive.google.com/drive/folders/1HQqdau5ytSMnGBI\_D-N6iCLpVgC2oaOn

files on this folder contains:
Agent Names or Action performed by is under Column A, note to exclude the productivity count of the name Sleep Expert. 
Closed Conversations (Column B)
Conversations assigned (Column C)

Conversations replied to (Column D)

Replies sent (Column E)

Now those are the the data sources of each of the cards inside the tool. Every file has a specified LOB, like example: voice under support is named above on the LOB guide. 



ABSENTEEISM GUIDE: 

lets work on the absenteeism rate. this is the sheet file for where we should get the absenteeism rates.  

https://docs.google.com/spreadsheets/d/1x5P-0ZHbVvl7TJeEN2Q-iSyn9JfaKrwLCPF6leFixXQ/edit?pli=1&gid=783994675#gid=783994675

Support agents are tagged as 
Agent - Early Returns
Agent - Ret Mit
Agent - PTC
Agent - WGS OB
Agent - Pre Delivery

Sales are 
Agent - Sales

Service Recovery LOB are marked as
Agent - Service Recovery

they are all found on Column F under POD's Header. the set up is found on the image. Basically its calculated as Total Present - Absences. 

This is the formula used on excel to calculate the absences. 

=COUNTIF(AF7:AF198,"ML")
 +COUNTIF(AF7:AF198,"A")
 +COUNTIF(AF7:AF198,"HDSL")
 +COUNTIF(AF7:AF198,"SL")
 +COUNTIF(AF7:AF198,"LOA")

This is for the total agents active

=COUNTIFS(AF7:AF198, "<>", AF7:AF198, "<>N", AF7:AF198, "<>SUSP")

this is for the absenteeism rate. 
=IFERROR(AF284/AF285,"")

but this formula is for overall absences. we need to make it based on the LOB. so at above on the guide on the identification to who is support, sales, service recovery, we need to identify them separately. 
btw, if you notice, it is AF:AF198, that is for May 18 data, it will be AG7:AG198 tomorrow and AH7:AH198 the following day, so we need to adjust on that too since we are going to filter out daily. 














