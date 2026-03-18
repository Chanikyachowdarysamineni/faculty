import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(process.cwd(), "database.sqlite"));

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empId TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'faculty', 'dual', 'ta')),
    designation TEXT,
    department TEXT,
    mobile TEXT,
    email TEXT,
    maxWorkload INTEGER DEFAULT 40
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program TEXT NOT NULL,
    courseType TEXT NOT NULL,
    year TEXT,
    subjectCode TEXT UNIQUE NOT NULL,
    subjectName TEXT NOT NULL,
    shortName TEXT NOT NULL,
    l INTEGER DEFAULT 0,
    t INTEGER DEFAULT 0,
    p INTEGER DEFAULT 0,
    c INTEGER DEFAULT 0,
    mainFacultyId TEXT,
    FOREIGN KEY (mainFacultyId) REFERENCES users(empId)
  );

  CREATE TABLE IF NOT EXISTS workloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facultyId TEXT NOT NULL,
    courseCode TEXT NOT NULL,
    year INTEGER NOT NULL,
    section TEXT NOT NULL,
    l INTEGER DEFAULT 0,
    t INTEGER DEFAULT 0,
    p INTEGER DEFAULT 0,
    role TEXT NOT NULL CHECK (role IN ('Main Faculty', 'Supporting Faculty', 'TA')),
    position INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facultyId) REFERENCES users(empId),
    FOREIGN KEY (courseCode) REFERENCES courses(subjectCode)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facultyId TEXT NOT NULL,
    courseCode TEXT NOT NULL,
    priority INTEGER NOT NULL,
    remarks TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facultyId) REFERENCES users(empId),
    FOREIGN KEY (courseCode) REFERENCES courses(subjectCode)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (empId, name, password, role) VALUES (?, ?, ?, ?)")
    .run("ADMIN001", "System Admin", hashedPassword, "admin");
}

// Seed initial courses if not exists
const courseExists = db.prepare("SELECT COUNT(*) as count FROM courses").get() as any;
if (courseExists.count === 0) {
  const courses = [
    // B.Tech Mandatory
    { program: 'B.Tech', courseType: 'Mandatory', year: 'I', subjectCode: '25CS102', subjectName: 'Problem Solving through Python', shortName: 'PSP', l: 2, t: 0, p: 2, c: 3 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'II', subjectCode: '24CS209', subjectName: 'Design and Analysis of Algorithms', shortName: 'DAA', l: 3, t: 0, p: 2, c: 4 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'II', subjectCode: '22CS207', subjectName: 'Operating Systems', shortName: 'OS', l: 2, t: 0, p: 2, c: 3 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'II', subjectCode: '24CS207', subjectName: 'Full Stack Development', shortName: 'FSD', l: 0, t: 2, p: 2, c: 2 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'II', subjectCode: '24CS201', subjectName: 'Field Projects', shortName: 'FP', l: 0, t: 0, p: 2, c: 1 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'III', subjectCode: '22CS407', subjectName: 'Cryptography and Network Security', shortName: 'CNS', l: 2, t: 0, p: 2, c: 3 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'III', subjectCode: '22CS311', subjectName: 'Parallel and Distributed Computing', shortName: 'PDC', l: 2, t: 2, p: 0, c: 3 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'III', subjectCode: '22CS307', subjectName: 'Software Engineering', shortName: 'SE', l: 2, t: 0, p: 2, c: 3 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'III', subjectCode: '22CS305', subjectName: 'Industry Interface Course', shortName: 'IIC', l: 1, t: 0, p: 0, c: 1 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'III', subjectCode: '22CS308', subjectName: 'Inter-Disciplinary Project - Phase II', shortName: 'IDP-II', l: 0, t: 0, p: 2, c: 2 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'IV', subjectCode: '22CS404', subjectName: 'Project Work', shortName: 'PROJECT', l: 0, t: 2, p: 22, c: 12 },
    { program: 'B.Tech', courseType: 'Mandatory', year: 'II', subjectCode: '24SA201', subjectName: 'UHV', shortName: 'BG', l: 0, t: 0, p: 2, c: 1 },
    // B.Tech Electives
    { program: 'B.Tech', courseType: 'Department Elective', year: 'III', subjectCode: '22CS801', subjectName: 'Advanced Data Structures', shortName: 'ADS', l: 2, t: 2, p: 2, c: 4 },
    { program: 'B.Tech', courseType: 'Department Elective', year: 'III', subjectCode: '22CS802', subjectName: 'Advanced JAVA Programming', shortName: 'AJP', l: 2, t: 2, p: 2, c: 4 },
    { program: 'B.Tech', courseType: 'Department Elective', year: 'III', subjectCode: '22CS804', subjectName: 'Deep Learning', shortName: 'DL', l: 2, t: 2, p: 2, c: 4 },
    { program: 'B.Tech', courseType: 'Department Elective', year: 'III', subjectCode: '22CS805', subjectName: 'Digital Image Processing', shortName: 'DIP', l: 2, t: 2, p: 2, c: 4 },
    { program: 'B.Tech', courseType: 'Department Elective', year: 'III', subjectCode: '22CS806', subjectName: 'Machine Learning', shortName: 'ML', l: 2, t: 2, p: 2, c: 4 },
    { program: 'B.Tech', courseType: 'Department Elective', year: 'III', subjectCode: '22CS807', subjectName: 'Mobile Ad-hoc Networks', shortName: 'MAN', l: 2, t: 2, p: 2, c: 4 },
    { program: 'B.Tech', courseType: 'Department Elective', year: 'III', subjectCode: '22CS808', subjectName: 'Mobile Application Development', shortName: 'MAD', l: 2, t: 2, p: 2, c: 4 },
    // M.Tech Mandatory
    { program: 'M.Tech', courseType: 'Mandatory', year: '', subjectCode: '25CSB105', subjectName: 'Cloud Computing', shortName: 'CC', l: 2, t: 2, p: 2, c: 4 },
    { program: 'M.Tech', courseType: 'Mandatory', year: '', subjectCode: '25CSB106', subjectName: 'Big Data and Analytics', shortName: 'BDA', l: 2, t: 2, p: 2, c: 4 },
    // M.Tech Electives
    { program: 'M.Tech', courseType: 'Department Elective', year: '', subjectCode: '25CSB803', subjectName: 'Deep Learning', shortName: 'DL', l: 3, t: 0, p: 2, c: 4 },
    { program: 'M.Tech', courseType: 'Department Elective', year: '', subjectCode: '25CSB806', subjectName: 'Full Stack Development', shortName: 'FSD', l: 3, t: 0, p: 2, c: 4 },
  ];

  const insert = db.prepare("INSERT INTO courses (program, courseType, year, subjectCode, subjectName, shortName, l, t, p, c) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  courses.forEach(c => insert.run(c.program, c.courseType, c.year, c.subjectCode, c.subjectName, c.shortName, c.l, c.t, c.p, c.c));
}

export default db;
