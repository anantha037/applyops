"""Calendar verification baseline."""
from backend.db.session import engine
from sqlmodel import Session, text

with Session(engine) as s:
    print("=== CALENDAR EVENTS ===")
    events = s.exec(text("SELECT id, title, event_date, time, event_type FROM calendar_events ORDER BY event_date DESC")).all()
    for e in events:
        print(f"  id={e[0][:8]}... title={e[1]!r} start={e[2]} end={e[3]} type={e[4]}")
    print(f"  Total events: {len(events)}")
    
    print("\n=== RECENT APPLICATIONS ===")
    apps = s.exec(text("SELECT id, company, next_action_due, interview_date FROM applications ORDER BY date_applied DESC LIMIT 3")).all()
    for a in apps:
        print(f"  id={a[0][:8]}... company={a[1]!r} next_action_due={a[2]} interview_date={a[3]}")
