"""Step 5 resume upload/reuse DB verification."""
from backend.db.session import engine
from sqlmodel import Session, text

with Session(engine) as s:
    print("=== STEP 5A: Resume upload — app + resume in DB ===")
    r5a = s.exec(text(
        "SELECT a.id, a.company, a.job_title, a.resume_id, r.filename, r.storage_key "
        "FROM applications a "
        "LEFT JOIN resumes r ON r.id = a.resume_id "
        "WHERE a.company='TestCo Resume Upload' "
        "ORDER BY a.date_applied DESC LIMIT 1"
    )).first()
    if r5a:
        print(f"  app_id={r5a[0]}")
        print(f"  resume_id={r5a[3]}   <- should be non-null")
        print(f"  resume filename={r5a[4]!r}")
        print(f"  storage_key={r5a[5]!r}")
        step5a_resume_id = r5a[3]
        step5a_pass = r5a[3] is not None
        print(f"  RESULT: {'PASS' if step5a_pass else 'FAIL'}")
    else:
        print("  NOT FOUND - FAIL")
        step5a_resume_id = None

    print()
    print("=== STEP 5B: Resume reuse — same resume_id, no new R2 object ===")
    r5b = s.exec(text(
        "SELECT a.id, a.company, a.job_title, a.resume_id, r.filename, r.storage_key "
        "FROM applications a "
        "LEFT JOIN resumes r ON r.id = a.resume_id "
        "WHERE a.company='TestCo Resume Reuse' "
        "ORDER BY a.date_applied DESC LIMIT 1"
    )).first()
    if r5b:
        print(f"  app_id={r5b[0]}")
        print(f"  resume_id={r5b[3]}")
        match = r5b[3] == step5a_resume_id
        print(f"  resume_id == step5a resume_id? {match}  <- should be True (no duplicate upload)")
        print(f"  resume filename={r5b[4]!r}")
        print(f"  storage_key={r5b[5]!r}")
        step5b_pass = r5b[3] == step5a_resume_id
        print(f"  RESULT: {'PASS' if step5b_pass else 'FAIL'}")
    else:
        print("  NOT FOUND - FAIL")

    print()
    # Check for duplicate R2 objects by looking for duplicate storage_keys with same filename
    dupes = s.exec(text(
        "SELECT filename, COUNT(*) as cnt, COUNT(DISTINCT storage_key) as uniq_keys "
        "FROM resumes "
        "GROUP BY filename "
        "HAVING COUNT(*) > 1"
    )).all()
    if dupes:
        for d in dupes:
            print(f"  Duplicate filename detected: {d[0]!r} -> {d[1]} rows, {d[2]} unique storage_keys")
            if d[2] == d[1]:
                print("    -> Each is a distinct R2 object (different storage_key) — POTENTIAL DUPLICATE UPLOAD")
            else:
                print("    -> Some share the same storage_key — likely pre-migration test data, not new duplicates")
    else:
        print("  No filename duplicates with differing storage_keys for new uploads — PASS")

    print()
    print("=== ALL RESUMES (for full picture) ===")
    all_res = s.exec(text(
        "SELECT id, filename, storage_key FROM resumes ORDER BY uploaded_at DESC"
    )).all()
    for rv in all_res:
        print(f"  id={rv[0][:8]}... filename={rv[1]!r} storage_key={rv[2]!r}")

    print()
    print("=== FINAL TOTALS ===")
    app_count = s.exec(text("SELECT COUNT(*) FROM applications")).one()
    contact_count = s.exec(text("SELECT COUNT(*) FROM contacts")).one()
    resume_count = s.exec(text("SELECT COUNT(*) FROM resumes")).one()
    print(f"  Total apps:     {app_count[0]}  (was 15 before all tests, +5 = 20 expected)")
    print(f"  Total contacts: {contact_count[0]}  (was 5 before all tests, +1 = 6 expected)")
    print(f"  Total resumes:  {resume_count[0]}  (was 3 before tests, +1 new upload = 4 expected)")
