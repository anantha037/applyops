"""Post-test DB verification for Applications e2e test."""
from backend.db.session import engine
from sqlmodel import Session, text

with Session(engine) as s:
    print("=== STEP 1: Minimal app (no contact, no resume) ===")
    r = s.exec(text(
        "SELECT id, company, job_title, status, contact_id, resume_id "
        "FROM applications WHERE company='TestCo No Contact' "
        "ORDER BY date_applied DESC LIMIT 1"
    )).first()
    if r:
        step1_id = r[0]
        print(f"  id={r[0]}")
        print(f"  company={r[1]!r}")
        print(f"  status={r[3]!r}")
        print(f"  contact_id={r[4]}  <- should be NULL")
        print(f"  resume_id={r[5]}   <- should be NULL")
        step1_pass = r[4] is None and r[5] is None
        print(f"  RESULT: {'PASS' if step1_pass else 'FAIL'}")
    else:
        print("  NOT FOUND - FAIL")
        step1_id = None

    print()
    print("=== STEP 2: App with new contact ===")
    r2 = s.exec(text(
        "SELECT a.id, a.company, a.job_title, a.contact_id, a.resume_id, "
        "c.name, c.email, c.role "
        "FROM applications a "
        "LEFT JOIN contacts c ON c.id = a.contact_id "
        "WHERE a.company='TestCo With Contact' "
        "ORDER BY a.date_applied DESC LIMIT 1"
    )).first()
    if r2:
        step2_contact_id = r2[3]
        print(f"  app_id={r2[0]}")
        print(f"  contact_id={r2[3]}  <- should be non-null")
        print(f"  resume_id={r2[4]}   <- should be NULL")
        print(f"  contact.name={r2[5]!r}")
        print(f"  contact.email={r2[6]!r}")
        step2_pass = r2[3] is not None and r2[4] is None
        print(f"  RESULT: {'PASS' if step2_pass else 'FAIL'}")
    else:
        print("  NOT FOUND - FAIL")
        step2_contact_id = None

    print()
    print("=== STEP 3: Duplicate contact dedup ===")
    r3 = s.exec(text(
        "SELECT a.id, a.company, a.contact_id, c.name, c.email "
        "FROM applications a "
        "LEFT JOIN contacts c ON c.id = a.contact_id "
        "WHERE a.company='TestCo Duplicate Contact' "
        "ORDER BY a.date_applied DESC LIMIT 1"
    )).first()
    if r3:
        print(f"  app_id={r3[0]}")
        print(f"  contact_id={r3[2]}")
        match = r3[2] == step2_contact_id
        print(f"  contact_id == step2 contact_id? {match}  <- should be True")
        print(f"  contact.name={r3[3]!r}  contact.email={r3[4]!r}")
    else:
        print("  NOT FOUND - FAIL")

    cnt = s.exec(text("SELECT COUNT(*) FROM contacts WHERE email='jane.smith.test@example.com'")).one()
    print(f"  Total contacts with email 'jane.smith.test@example.com': {cnt[0]}  <- should be exactly 1")
    step3_pass = cnt[0] == 1 and (r3 is not None) and (r3[2] == step2_contact_id)
    print(f"  RESULT: {'PASS' if step3_pass else 'FAIL'}")

    print()
    print("=== STEP 4: Status change persistence ===")
    if step1_id:
        rs = s.exec(text(f"SELECT status FROM applications WHERE id='{step1_id}'")).one()
        print(f"  id={step1_id}")
        print(f"  status={rs[0]!r}  <- should be 'In Progress'")
        step4_pass = rs[0] == "In Progress"
        print(f"  RESULT: {'PASS' if step4_pass else 'FAIL'}")
    else:
        print("  step1_id unknown - SKIP")

    print()
    print("=== STEP 5: Resume flow ===")
    resumes = s.exec(text("SELECT id, filename, storage_key FROM resumes ORDER BY uploaded_at DESC LIMIT 3")).all()
    print(f"  Total resume rows checked: {len(resumes)}")
    for rv in resumes:
        print(f"    id={rv[0][:8]}... filename={rv[1]!r} storage_key={rv[2]!r}")
    print("  (Resume upload test requires UI interaction - see browser test report)")

    print()
    print("=== TOTALS ===")
    app_count = s.exec(text("SELECT COUNT(*) FROM applications")).one()
    contact_count = s.exec(text("SELECT COUNT(*) FROM contacts")).one()
    print(f"  Total apps:     {app_count[0]}  (was 15 before tests, +3 = 18 expected)")
    print(f"  Total contacts: {contact_count[0]}  (was 5 before tests, +1 jane.smith = 6 expected)")
