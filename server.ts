import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./src/db.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== "admin" && req.user.role !== "dual") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Auth Routes
  app.post("/api/auth/login", (req, res) => {
    const { empId, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE empId = ?").get(empId);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, empId: user.empId, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, user: { empId: user.empId, name: user.name, role: user.role } });
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    res.json(req.user);
  });

  // Faculty Routes
  app.get("/api/faculty", authenticateToken, (req, res) => {
    const faculty = db.prepare("SELECT id, empId, name, role, designation, department, mobile, email, maxWorkload FROM users WHERE role IN ('faculty', 'dual', 'ta')").all();
    res.json(faculty);
  });

  app.post("/api/faculty", authenticateToken, isAdmin, (req: any, res) => {
    const { empId, name, password, role, designation, department, mobile, email, maxWorkload } = req.body;
    const hashedPassword = bcrypt.hashSync(password || "faculty123", 10);
    try {
      db.prepare("INSERT INTO users (empId, name, password, role, designation, department, mobile, email, maxWorkload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(empId, name, hashedPassword, role || "faculty", designation, department, mobile, email, maxWorkload || 40);
      
      db.prepare("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)")
        .run(req.user.empId, "ADD_FACULTY", `Added faculty: ${name} (${empId})`);
        
      res.status(201).json({ message: "Faculty added" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/faculty/:id", authenticateToken, isAdmin, (req: any, res) => {
    const { name, role, designation, department, mobile, email, empId, maxWorkload } = req.body;
    try {
      db.prepare("UPDATE users SET name = ?, role = ?, designation = ?, department = ?, mobile = ?, email = ?, maxWorkload = ? WHERE id = ?")
        .run(name, role, designation, department, mobile, email, maxWorkload || 40, req.params.id);
      
      db.prepare("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)")
        .run(req.user.empId, "EDIT_FACULTY", `Updated faculty: ${name} (${empId || 'ID:' + req.params.id})`);

      res.json({ message: "Faculty updated" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/faculty/:id", authenticateToken, isAdmin, (req: any, res) => {
    try {
      const faculty: any = db.prepare("SELECT name, empId FROM users WHERE id = ?").get(req.params.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
      
      if (faculty) {
        db.prepare("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)")
          .run(req.user.empId, "DELETE_FACULTY", `Deleted faculty: ${faculty.name} (${faculty.empId})`);
      }

      res.json({ message: "Faculty deleted" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/faculty/bulk", authenticateToken, isAdmin, (req: any, res) => {
    const facultyList = req.body;
    if (!Array.isArray(facultyList)) return res.status(400).json({ error: "Invalid data format" });

    const insert = db.prepare("INSERT OR IGNORE INTO users (empId, name, password, role, designation, department, mobile, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const logInsert = db.prepare("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)");
    
    const transaction = db.transaction((list) => {
      for (const f of list) {
        const hashedPassword = bcrypt.hashSync(f.password || "faculty123", 10);
        insert.run(f.empId, f.name, hashedPassword, f.role || "faculty", f.designation, f.department || "CSE", f.mobile, f.email);
      }
      logInsert.run(req.user.empId, "BULK_ADD_FACULTY", `Bulk imported ${list.length} faculty members`);
    });

    try {
      transaction(facultyList);
      res.json({ message: `${facultyList.length} faculty members imported successfully` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Audit Log Routes
  app.get("/api/audit-logs", authenticateToken, isAdmin, (req, res) => {
    const logs = db.prepare(`
      SELECT a.*, u.name as userName 
      FROM audit_logs a
      JOIN users u ON a.userId = u.empId
      ORDER BY a.timestamp DESC
      LIMIT 100
    `).all();
    res.json(logs);
  });

  // Course Routes
  app.get("/api/courses", authenticateToken, (req, res) => {
    const { page = 1, limit = 10, program, courseType, year, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = "SELECT * FROM courses WHERE 1=1";
    const params: any[] = [];

    if (program) {
      query += " AND program = ?";
      params.push(program);
    }
    if (courseType) {
      query += " AND courseType = ?";
      params.push(courseType);
    }
    if (year) {
      query += " AND year = ?";
      params.push(year);
    }
    if (search) {
      query += " AND (subjectName LIKE ? OR subjectCode LIKE ? OR shortName LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
    const totalCount: any = db.prepare(countQuery).get(...params);

    query += " LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const courses = db.prepare(query).all(...params);
    res.json({ courses, total: totalCount.count });
  });

  app.get("/api/courses/:id", authenticateToken, (req, res) => {
    const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  });

  app.post("/api/courses", authenticateToken, isAdmin, (req, res) => {
    const { program, courseType, year, subjectCode, subjectName, shortName, l, t, p, c, mainFacultyId } = req.body;
    try {
      db.prepare("INSERT INTO courses (program, courseType, year, subjectCode, subjectName, shortName, l, t, p, c, mainFacultyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(program, courseType, year, subjectCode.toUpperCase(), subjectName, shortName, l || 0, t || 0, p || 0, c || 0, mainFacultyId);
      res.status(201).json({ message: "Course added" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/courses/:id", authenticateToken, isAdmin, (req, res) => {
    const { program, courseType, year, subjectCode, subjectName, shortName, l, t, p, c, mainFacultyId } = req.body;
    try {
      db.prepare("UPDATE courses SET program = ?, courseType = ?, year = ?, subjectCode = ?, subjectName = ?, shortName = ?, l = ?, t = ?, p = ?, c = ?, mainFacultyId = ? WHERE id = ?")
        .run(program, courseType, year, subjectCode.toUpperCase(), subjectName, shortName, l || 0, t || 0, p || 0, c || 0, mainFacultyId, req.params.id);
      res.json({ message: "Course updated" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/courses/:id", authenticateToken, isAdmin, (req, res) => {
    try {
      const course: any = db.prepare("SELECT subjectCode FROM courses WHERE id = ?").get(req.params.id);
      if (!course) return res.status(404).json({ error: "Course not found" });

      const workloadCount: any = db.prepare("SELECT COUNT(*) as count FROM workloads WHERE courseCode = ?").get(course.subjectCode);
      const submissionCount: any = db.prepare("SELECT COUNT(*) as count FROM submissions WHERE courseCode = ?").get(course.subjectCode);

      if (workloadCount.count > 0 || submissionCount.count > 0) {
        return res.status(400).json({ error: "Cannot delete course as it is referenced in Workload or Submissions" });
      }

      db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
      res.json({ message: "Course deleted" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/courses/bulk", authenticateToken, isAdmin, (req, res) => {
    const courses = req.body;
    if (!Array.isArray(courses)) return res.status(400).json({ error: "Invalid data format" });

    const insert = db.prepare("INSERT OR REPLACE INTO courses (program, courseType, year, subjectCode, subjectName, shortName, l, t, p, c, mainFacultyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const transaction = db.transaction((courses) => {
      for (const course of courses) {
        insert.run(course.program, course.courseType, course.year, course.subjectCode.toUpperCase(), course.subjectName, course.shortName, course.l || 0, course.t || 0, course.p || 0, course.c || 0, course.mainFacultyId);
      }
    });

    try {
      transaction(courses);
      res.json({ message: `${courses.length} courses imported successfully` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Workload Routes
  app.get("/api/workloads", authenticateToken, (req: any, res) => {
    let workloads;
    if (req.user.role === "admin" || req.user.role === "dual") {
      workloads = db.prepare(`
        SELECT w.*, u.name as facultyName, c.subjectName as courseName 
        FROM workloads w
        JOIN users u ON w.facultyId = u.empId
        JOIN courses c ON w.courseCode = c.subjectCode
      `).all();
    } else {
      workloads = db.prepare(`
        SELECT w.*, u.name as facultyName, c.subjectName as courseName 
        FROM workloads w
        JOIN users u ON w.facultyId = u.empId
        JOIN courses c ON w.courseCode = c.subjectCode
        WHERE w.facultyId = ?
      `).all(req.user.empId);
    }
    res.json(workloads);
  });

  app.post("/api/workloads", authenticateToken, isAdmin, (req: any, res) => {
    const { facultyId, courseCode, year, section, l, t, p, role, position, isOverride } = req.body;
    try {
      db.prepare("INSERT INTO workloads (facultyId, courseCode, year, section, l, t, p, role, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(facultyId, courseCode, year, section, l, t, p, role, position || 0);
      
      if (isOverride) {
        db.prepare("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)")
          .run(req.user.empId, "WORKLOAD_OVERRIDE", `Manual override for ${facultyId} on ${courseCode} (${section}): L:${l}, T:${t}, P:${p}`);
      } else {
        db.prepare("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)")
          .run(req.user.empId, "ASSIGN_WORKLOAD", `Assigned workload to ${facultyId}: ${courseCode} (${section})`);
      }

      res.status(201).json({ message: "Workload assigned" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/workloads/:id", authenticateToken, isAdmin, (req: any, res) => {
    const { facultyId, courseCode, year, section, l, t, p, role, position, isOverride } = req.body;
    try {
      db.prepare("UPDATE workloads SET facultyId = ?, courseCode = ?, year = ?, section = ?, l = ?, t = ?, p = ?, role = ?, position = ? WHERE id = ?")
        .run(facultyId, courseCode, year, section, l, t, p, role, position || 0, req.params.id);
      
      if (isOverride) {
        db.prepare("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)")
          .run(req.user.empId, "WORKLOAD_OVERRIDE", `Manual override update for ${facultyId} on ${courseCode} (${section}): L:${l}, T:${t}, P:${p}`);
      } else {
        db.prepare("INSERT INTO audit_logs (userId, action, details) VALUES (?, ?, ?)")
          .run(req.user.empId, "EDIT_WORKLOAD", `Updated workload for ${facultyId}: ${courseCode} (${section})`);
      }

      res.json({ message: "Workload updated" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/workloads/:id", authenticateToken, isAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM workloads WHERE id = ?").run(req.params.id);
      res.json({ message: "Workload deleted" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Preference Routes
  app.get("/api/preferences", authenticateToken, (req: any, res) => {
    let preferences;
    if (req.user.role === "admin" || req.user.role === "dual") {
      preferences = db.prepare(`
        SELECT s.*, c.subjectName as courseName, u.name as facultyName
        FROM submissions s
        JOIN courses c ON s.courseCode = c.subjectCode
        JOIN users u ON s.facultyId = u.empId
        ORDER BY u.name ASC, s.priority ASC
      `).all();
    } else {
      preferences = db.prepare(`
        SELECT s.*, c.subjectName as courseName 
        FROM submissions s
        JOIN courses c ON s.courseCode = c.subjectCode
        WHERE s.facultyId = ?
        ORDER BY s.priority ASC
      `).all(req.user.empId);
    }
    res.json(preferences);
  });

  app.post("/api/preferences", authenticateToken, (req: any, res) => {
    const { courseCode, priority, remarks } = req.body;
    try {
      db.prepare("INSERT INTO submissions (facultyId, courseCode, priority, remarks) VALUES (?, ?, ?, ?)")
        .run(req.user.empId, courseCode, priority, remarks);
      res.status(201).json({ message: "Preference submitted" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/preferences/:id", authenticateToken, (req: any, res) => {
    try {
      db.prepare("DELETE FROM submissions WHERE id = ? AND facultyId = ?")
        .run(req.params.id, req.user.empId);
      res.json({ message: "Preference deleted" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
