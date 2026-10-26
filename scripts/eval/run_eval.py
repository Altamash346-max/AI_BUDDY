"""Evaluation run for the Placement Prep paper. Every number reported in Section VI comes from this script.

E1  latency of non-LLM API endpoints (30 sequential requests each, after one warm-up)
E2  LLM endpoints: roadmap generation, quiz generation, chat, interview questions
E3  roadmap adaptation: invariants and weak-topic handling, plus instruction-driven adaptation
E4  reachability of LLM-suggested resource links
"""
import json
import math
import re
import statistics
import sys
import time
from urllib.parse import quote, urlparse

import requests

BASE = "http://localhost:4000/api"
OUT = sys.argv[1]  # usage: EVAL_EMAIL=... EVAL_PASSWORD=... python run_eval.py results.json
import os
# Demo account credentials come from the environment, never from the repo
CREDS = {"email": os.environ["EVAL_EMAIL"], "password": os.environ["EVAL_PASSWORD"]}

s = requests.Session()
R = {"meta": {"started": time.strftime("%Y-%m-%d %H:%M:%S")}}


def save():
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(R, f, indent=2, ensure_ascii=False)


def p95(xs):
    xs = sorted(xs)
    return xs[max(0, math.ceil(0.95 * len(xs)) - 1)]


def timed(method, path, **kw):
    timeout = kw.pop("timeout", 240)
    t = time.perf_counter()
    r = s.request(method, BASE + path, timeout=timeout, **kw)
    return r, (time.perf_counter() - t) * 1000.0


def log(*a):
    print(*a, flush=True)


r = s.post(BASE + "/users/login", json=CREDS, timeout=30)
r.raise_for_status()
roadmaps = s.get(BASE + "/roadmap/me", timeout=30).json()["data"]
dsa = next(rm["_id"] for rm in roadmaps if rm["subject"].startswith("Data Structures"))

# ---------------- E1: non-LLM endpoint latency ----------------
endpoints = [
    ("POST", "/users/login", "/users/login", {"json": CREDS}),
    ("GET", "/users/me", "/users/me", {}),
    ("GET", "/roadmap/me", "/roadmap/me", {}),
    ("GET", f"/roadmap/{dsa}", "/roadmap/:id", {}),
    ("GET", "/progress/stats", "/progress/stats", {}),
    ("GET", f"/progress/roadmap/{dsa}", "/progress/roadmap/:id", {}),
    ("GET", "/interview/profile", "/interview/profile", {}),
]
R["E1"] = []
for method, path, label, kw in endpoints:
    timed(method, path, **kw)  # warm-up
    ts, sizes = [], []
    for _ in range(30):
        resp, dt = timed(method, path, **kw)
        resp.raise_for_status()
        ts.append(dt)
        sizes.append(len(resp.content))
    row = {"endpoint": f"{method} {label}", "median_ms": round(statistics.median(ts), 1),
           "p95_ms": round(p95(ts), 1), "kb": round(statistics.mean(sizes) / 1024, 1), "n": len(ts)}
    R["E1"].append(row)
    log("E1", row)
save()

# ---------------- E2a: roadmap generation ----------------
SUBJECTS = ["Database Management Systems", "Operating Systems", "Computer Networks",
            "Object-Oriented Programming in Java", "System Design Basics"]
VALID_TYPES = {"video", "article", "documentation", "course", "practice", "project"}
R["E2_generate"] = []
eval_roadmaps = []
for subj in SUBJECTS:
    body = {"subject": subj, "goal": "Placement", "level": "Intermediate", "timeAvailable": "2 hours/day"}
    resp, dt = timed("POST", "/roadmap/generate", json=body)
    row = {"subject": subj, "status": resp.status_code, "ms": round(dt)}
    if resp.ok:
        data = resp.json()["data"]
        topics = data["topics"]
        res_counts = [len(t.get("resources", [])) for t in topics]
        types = [res.get("type") for t in topics for res in t.get("resources", [])]
        row.update({
            "roadmap_id": data["roadmap"]["_id"],
            "topics": len(topics),
            "topics_in_8_10": 8 <= len(topics) <= 10,
            "resources_per_topic": res_counts,
            "all_topics_2_3_resources": all(2 <= c <= 3 for c in res_counts),
            "types_valid": all(tp in VALID_TYPES for tp in types),
            "titles": [t["title"] for t in topics],
            "urls": [res.get("url") for t in topics for res in t.get("resources", [])],
        })
        eval_roadmaps.append(row)
    R["E2_generate"].append(row)
    log("E2 generate", subj, resp.status_code, round(dt), row.get("topics"))
    save()

# ---------------- E3: adaptation (weak topic, then instruction) ----------------
R["E2_quiz"], R["E3_weak"], R["E3_instruction"] = [], [], []
STOP = {"and", "the", "with", "for", "from", "into", "basics", "fundamentals", "introduction", "advanced", "concepts"}
for rm in eval_roadmaps:
    rid = rm["roadmap_id"]
    topics = s.get(BASE + f"/roadmap/{rid}", timeout=30).json()["data"]["topics"]
    for t in topics[:2]:
        s.post(BASE + "/progress/complete", json={"topicId": t["_id"]}, timeout=30).raise_for_status()
    weak = topics[2]
    # Quiz on the third topic, answered wrongly on purpose (score 0)
    resp, dt = timed("POST", f"/quiz/{weak['_id']}/generate")
    R["E2_quiz"].append({"topic": weak["title"], "status": resp.status_code, "ms": round(dt),
                         "questions": len(resp.json()["data"]["questions"]) if resp.ok else None})
    if not resp.ok:
        log("quiz generation failed for", weak["title"], resp.status_code)
        save()
        continue
    n = len(resp.json()["data"]["questions"])
    first = s.post(BASE + f"/quiz/{weak['_id']}/submit", json={"answers": [0] * n}, timeout=30).json()["data"]
    wrong = [(q["correctOptionIndex"] + 1) % 4 for q in first["results"]]
    score = s.post(BASE + f"/quiz/{weak['_id']}/submit", json={"answers": wrong}, timeout=30).json()["data"]["score"]

    completed_before = [t["_id"] for t in topics[:2]]
    resp, dt = timed("POST", f"/roadmap/{rid}/adapt", json={"instruction": ""})
    row = {"subject": rm["subject"], "weak_topic": weak["title"], "weak_score": score,
           "status": resp.status_code, "ms": round(dt)}
    if resp.ok:
        data = resp.json()["data"]
        new = data["topics"]
        completed_after = [t["_id"] for t in new if t["status"] == "completed"]
        remaining = [t for t in new if t["status"] != "completed"]
        keywords = [w for w in re.findall(r"[a-z]+", weak["title"].lower()) if len(w) > 3 and w not in STOP]
        revision = [t["title"] for t in remaining
                    if any(k in t["title"].lower() for k in keywords) or "revis" in t["title"].lower()]
        row.update({
            "completed_preserved": completed_after == completed_before,
            "completed_orders": [t["order"] for t in new if t["status"] == "completed"],
            "current_count": sum(t["status"] == "current" for t in new),
            "first_remaining_is_current": bool(remaining) and remaining[0]["status"] == "current",
            "remaining_count": len(remaining),
            "remaining_in_3_10": 3 <= len(remaining) <= 10,
            "revision_topics": revision,
            "revision_present": bool(revision),
            "new_titles": [t["title"] for t in remaining],
            "summary": data.get("summary", ""),
        })
    R["E3_weak"].append(row)
    log("E3 weak", rm["subject"], resp.status_code, round(dt), row.get("revision_present"), row.get("completed_preserved"))
    save()

    before_remaining = row.get("remaining_count")
    instr = "I only have 1 hour per day now; keep only the most important remaining topics."
    resp, dt = timed("POST", f"/roadmap/{rid}/adapt", json={"instruction": instr})
    row2 = {"subject": rm["subject"], "status": resp.status_code, "ms": round(dt),
            "remaining_before": before_remaining}
    if resp.ok:
        new = resp.json()["data"]["topics"]
        row2.update({
            "remaining_after": sum(t["status"] != "completed" for t in new),
            "completed_preserved": [t["_id"] for t in new if t["status"] == "completed"] == completed_before,
            "summary": resp.json()["data"].get("summary", ""),
        })
    R["E3_instruction"].append(row2)
    log("E3 instruction", rm["subject"], resp.status_code, round(dt), row2.get("remaining_before"), row2.get("remaining_after"))
    save()

# ---------------- E2b: chatbot ----------------
QUESTIONS = [
    ("What is the difference between a process and a thread?", None),
    ("Explain normalization up to 3NF with a short example.", None),
    ("How does a hash map handle collisions?", None),
    ("What is the time complexity of binary search and why?", None),
    ("How should I answer 'Tell me about yourself' in a placement interview?", None),
    ("What is a deadlock and what are its four necessary conditions?", None),
    ("Explain the difference between TCP and UDP.", None),
    ("What is polymorphism in object-oriented programming?", None),
    ("I scored low on my last quiz. What should I revise first?", "ctx"),
    ("Can you explain the current topic on my roadmap in simple terms?", "ctx"),
]
dsa_topics = s.get(BASE + f"/roadmap/{dsa}", timeout=30).json()["data"]["topics"]
current = next((t for t in dsa_topics if t["status"] == "current"), dsa_topics[0])
R["E2_chat"] = []
for q, ctx in QUESTIONS:
    body = {"messages": [{"role": "user", "content": q}]}
    if ctx:
        body["topicId"] = current["_id"]
    resp, dt = timed("POST", "/chat", json=body)
    reply = resp.json()["data"]["reply"] if resp.ok else ""
    R["E2_chat"].append({"question": q, "with_topic_context": bool(ctx), "status": resp.status_code,
                         "ms": round(dt), "reply_words": len(reply.split()),
                         "mentions_current_topic": any(w in reply.lower() for w in
                                                       re.findall(r"[a-z]{5,}", current["title"].lower()))})
    log("E2 chat", resp.status_code, round(dt))
    save()

# ---------------- E2c: interview questions ----------------
R["E2_interview"] = []
for company, role in [("Amazon", "SDE-1 (Backend)"), ("TCS", "Digital Systems Engineer"), ("Infosys", "Specialist Programmer")]:
    resp, dt = timed("POST", "/interview/generate", json={"company": company, "role": role, "jobDescription": ""})
    row = {"company": company, "role": role, "status": resp.status_code, "ms": round(dt)}
    if resp.ok:
        q = resp.json()["data"]["generatedQuestions"]
        row["counts"] = {k: len(q.get(k, [])) for k in ["technical", "projectBased", "behavioral", "culturalFit"]}
        row["project_questions"] = q.get("projectBased", [])
    R["E2_interview"].append(row)
    log("E2 interview", company, resp.status_code, round(dt), row.get("counts"))
    save()

# ---------------- E4: resource-link reachability ----------------
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"}
urls = sorted({u for rm in eval_roadmaps for u in rm["urls"] if u})
R["E4"] = []
for u in urls:
    host = urlparse(u).netloc.lower().removeprefix("www.")
    row = {"url": u, "host": host}
    try:
        if "youtube.com" in host or "youtu.be" in host:
            # YouTube answers 200 even for missing videos, so ask its oEmbed endpoint instead
            rr = requests.get("https://www.youtube.com/oembed?format=json&url=" + quote(u, safe=""), headers=UA, timeout=15)
            row["method"] = "youtube-oembed"
        else:
            rr = requests.get(u, headers=UA, timeout=15, allow_redirects=True, stream=True)
            rr.close()
            row["method"] = "GET"
        code = rr.status_code
        row["status"] = code
        row["class"] = ("reachable" if code < 400 else "not_found" if code in (404, 410)
                        else "blocked" if code in (401, 403, 429) else "error")
        if row["method"] == "youtube-oembed" and code in (400, 401, 403, 404):
            row["class"] = "not_found"  # missing, private or non-video URL
    except requests.RequestException as e:
        row["status"] = None
        row["class"] = "error"
        row["error"] = type(e).__name__
    R["E4"].append(row)
log("E4 links checked:", len(urls))
save()

# ---------------- cleanup ----------------
for rm in eval_roadmaps:
    s.delete(BASE + f"/roadmap/{rm['roadmap_id']}", timeout=30)
R["meta"]["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
save()
log("DONE")
