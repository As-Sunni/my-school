const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createPortalDatabase,
  isStudentLinkedToParent,
} = require("../portal-db.js");

test("portal database stores and loads student records", () => {
  const db = createPortalDatabase({ persist: false });

  db.collection("students").doc("stu-1").set({
    name: "Ahmed Bello",
    cls: "Primary 1",
    guardianPhone: "08012345678",
  });

  const saved = db.collection("students").doc("stu-1").get();
  assert.equal(saved.data().name, "Ahmed Bello");

  const list = db.collection("students").where("cls", "==", "Primary 1").get();
  assert.ok(list.docs.length >= 1);
});

test("portal database supports chained where filters for results queries", () => {
  const db = createPortalDatabase({ persist: false });

  db.collection("records").doc("r-1").set({
    studentId: "stu-1",
    cls: "Primary 1",
    session: "2025/2026",
    term: "First Term",
    subject: "Mathematics",
    total: 82,
  });

  const list = db
    .collection("records")
    .where("cls", "==", "Primary 1")
    .where("session", "==", "2025/2026")
    .where("term", "==", "First Term")
    .where("subject", "==", "Mathematics")
    .get();

  assert.ok(list.docs.length >= 1);
});

test("guardian phone matching links students to their parent", () => {
  const student = {
    guardianPhone: "080-1234-5678",
    parentPhone: "08012345678",
  };

  assert.equal(isStudentLinkedToParent(student, "08012345678"), true);
  assert.equal(isStudentLinkedToParent(student, "08076543210"), false);
});

test("portal database deletes only the selected staff record", () => {
  const db = createPortalDatabase({ persist: false });
  db.collection("staff").doc("stf-001").set({ name: "Aisha" });
  db.collection("staff").doc("stf-002").set({ name: "Bello" });

  db.doc("staff/stf-001").delete();

  const list = db.collection("staff").get().docs;
  assert.equal(list.length, 1);
  assert.equal(list[0].data().name, "Bello");
});

test("portal database provides seeded demo records", () => {
  const db = createPortalDatabase({ persist: false });
  const parent = db.doc("parents/p08012345678").get();
  assert.ok(parent.exists);
  assert.equal(parent.data().phone, "08012345678");
});

test("teacher dashboard allows subject switching across classes", () => {
  const fs = require("node:fs");
  const html = fs.readFileSync(
    "c:/Users/USER/Desktop/asss 2/Sa'adah Islamic Academy.html",
    "utf8",
  );

  assert.match(html, /parseTeacherSubjects\(raw\)/);
  assert.match(html, /teacherAllowedSubjects\(\)/);
  assert.match(
    html,
    /function teacherClassOptions\(selected = ""\) \{\s*const classes = CFG\.classes;/s,
  );
  assert.match(html, /<select id="r-sub">/);
  assert.match(html, /Choose a class and subject to upload results\./);
});

test("admin dashboard requires the school owner before opening", () => {
  const fs = require("node:fs");
  const html = fs.readFileSync(
    "c:/Users/USER/Desktop/asss 2/Sa'adah Islamic Academy.html",
    "utf8",
  );

  assert.match(html, /OWNER_ADMIN_CREDENTIAL/);
  assert.match(html, /abdulsalamsulyman552@gmail.com/);
  assert.match(html, /if \(role === "admin"\)/);
  assert.match(html, /Admin access is restricted/);
  assert.match(html, /if \(view === "admin" && !S\.isOwner\)/);
});

test("admin login asks for a password before opening the dashboard", () => {
  const fs = require("node:fs");
  const html = fs.readFileSync(
    "c:/Users/USER/Desktop/asss 2/Sa'adah Islamic Academy.html",
    "utf8",
  );

  assert.match(html, /Admin password/);
  assert.match(html, /id="a-cred"/);
  assert.doesNotMatch(
    html,
    /S\.isOwner\s*\?\s*`<p>Welcome back\. You are signed in as the school owner\.<\/p><button class="btn" style="width:100%" data-lg="admin">Enter Admin Dashboard<\/button>`\s*:\s*`<div class="fgrid" style="grid-template-columns:1fr">/,
  );
});

test("admin reset actions accept manual access codes instead of auto-generating one", () => {
  const fs = require("node:fs");
  const html = fs.readFileSync(
    "c:/Users/USER/Desktop/asss 2/Sa'adah Islamic Academy.html",
    "utf8",
  );

  assert.match(html, /async function resetStaff\(id\)/);
  assert.match(html, /async function resetParent\(id\)/);
  assert.doesNotMatch(
    html,
    /const code = genCode\(\);\s*await S\.db\.doc\("staff\/" \+ id\)\.update\(\{ hash: await sha\(code, id\) \}\);/s,
  );
  assert.doesNotMatch(
    html,
    /const code = genCode\(\);\s*await S\.db\.doc\("parents\/" \+ id\)\.update\(\{ hash: await sha\(code, id\) \}\);/s,
  );
  assert.match(html, /\^\[A-Za-z\]\{4,8\}\$/);
  assert.match(html, /New access code|Set a new access code|new access code/i);
});
