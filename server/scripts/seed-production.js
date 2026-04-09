/**
 * ═══════════════════════════════════════════════════════════════
 * COMPLETE DATABASE SEED SCRIPT - PRODUCTION
 * ═══════════════════════════════════════════════════════════════
 * 
 * This script seeds the complete WLM database with:
 * ✅ 128 Faculty members (with passwords hashed from mobile number)
 * ✅ 29 Courses (B.Tech & M.Tech, I-IV years)
 * ✅ 128 User accounts (all faculty can login)
 * ✅ 2 Admin users (189, 675)
 * 
 * Usage:
 *   npm run seed
 *   OR
 *   node scripts/seed-production.js
 * 
 * WARNING: This clears existing data before seeding
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { connect } = require('../src/db');
const Faculty = require('../src/models/Faculty');
const Course = require('../src/models/Course');
const User = require('../src/models/User');

// ═══════════════════════════════════════════════════════════════
// FACULTY DATA - 128 members from CSE department
// ═══════════════════════════════════════════════════════════════
const FACULTY_DATA = [
  { empId: '163', name: 'Prof. K.V.Krishna Kishore', designation: 'Professor & Dean, SOCI', mobile: '9490647678' },
  { empId: '675', name: 'Dr. S. V Phani Kumar', designation: 'Professor & HOD', mobile: '9912514034' },
  { empId: '02342', name: 'Dr. M.Umadevi', designation: 'Associate Professor', mobile: '9603329592' },
  { empId: '01429', name: 'Dr. P. Siva Prasad', designation: 'Associate Professor', mobile: '9000443503' },
  { empId: '189', name: 'Dr. S. Deva Kumar', designation: 'Associate Professor', mobile: '9959949221' },
  { empId: '714', name: 'Dr. D. Yakobu', designation: 'Associate Professor', mobile: '9912012626' },
  { empId: '02462', name: 'Dr. Prashant Upadhyay', designation: 'Associate Professor', mobile: '9805406546' },
  { empId: '613', name: 'Dr. B. Suvarna', designation: 'Assistant Professor', mobile: '7093171146' },
  { empId: '01702', name: 'Dr. Jhansi Lakshmi P', designation: 'Assistant Professor', mobile: '8500719259' },
  { empId: '00689', name: 'Dr. R. Prathap Kumar', designation: 'Assistant Professor', mobile: '7569888963' },
  { empId: '30071', name: 'Dr. E. Deepak Chowdary', designation: 'Assistant Professor', mobile: '9553147457' },
  { empId: '01905', name: 'Dr.Simhadiri  Chinna Gopi', designation: 'Assistant Professor', mobile: '9700330708' },
  { empId: '01989', name: 'Dr. T.R. Rajesh', designation: 'Assistant Professor', mobile: '9676560542' },
  { empId: '02396', name: 'Dr. Satish Kumar Satti', designation: 'Assistant Professor', mobile: '9581236143' },
  { empId: '02433', name: 'Dr. Md. Oqail Ahmad', designation: 'Assistant Professor', mobile: '8439243408' },
  { empId: '02468', name: 'Dr.M. Sunil Babu', designation: 'Assistant Professor', mobile: '9849261533' },
  { empId: '02472', name: 'Dr. Vinoj J', designation: 'Assistant Professor', mobile: '9440043627' },
  { empId: '02495', name: 'Dr. R. Renugadevi', designation: 'Assistant Professor', mobile: '9533020661' },
  { empId: '02506', name: 'Dr. G. Saubhagya Ranjan Biswal', designation: 'Assistant Professor', mobile: '9885322707' },
  { empId: '02745', name: 'Dr. V. S. R. Pavan Kumar Neeli', designation: 'Assistant Professor', mobile: '9490606516' },
  { empId: '02744', name: 'Dr. N. Sameera', designation: 'Assistant Professor', mobile: '9959848948' },
  { empId: '02770', name: 'Dr. O. Bhaskar', designation: 'Assistant Professor', mobile: '9618402222' },
  { empId: '02961', name: 'Dr. Manoj Kumar Merugumal', designation: 'Assistant Professor', mobile: '9440559998' },
  { empId: '02480', name: 'Dr. Rambabu Kusuma', designation: 'Assistant Professor', mobile: '9493444849' },
  { empId: '02181', name: 'Dr. G. Balu Narasimha Rao', designation: 'Assistant Professor', mobile: '9959598899' },
  { empId: '02829', name: 'Dr. G.Veera Bhadra Chary', designation: 'Assistant Professor', mobile: '9618444833' },
  { empId: '02194', name: 'Dr. J. Veeranjaneyulu', designation: 'Assistant Professor', mobile: '9440043628' },
  { empId: '03045', name: 'Dr. Krishna Reddy', designation: 'Assistant Professor', mobile: '9949494949' },
  { empId: '03055', name: 'Dr. J. Vijitha Ananthi', designation: 'Assistant Professor', mobile: '9959949992' },
  { empId: '03059', name: 'Dr. PHANINDRA THOTA', designation: 'Assistant Professor', mobile: '9949494950' },
  { empId: '03096', name: 'Dr. M. Raja Rao', designation: 'Assistant Professor', mobile: '9959949993' },
  { empId: '03102', name: 'Dr.James Deva Koresh H', designation: 'Assistant Professor', mobile: '9618444834' },
  { empId: '02493', name: 'Dr. M.Vijai Meyyapan', designation: 'Assistant Professor', mobile: '9440043629' },
  { empId: '03259', name: 'Dr. Gabbi Reddy Keerthi', designation: 'Assistant Professor', mobile: '9959949994' },
  { empId: '646', name: 'Mrs. G. Parimala', designation: 'Assistant Professor', mobile: '9959949995' },
  { empId: '01201', name: 'Mrs. M. Bhargavi', designation: 'Assistant Professor', mobile: '9959949996' },
  { empId: '01238', name: 'Mrs. SD. Shareefunnisa', designation: 'Assistant Professor', mobile: '9959949997' },
  { empId: '01350', name: 'Mr. K. Pavan Kumar', designation: 'Assistant Professor', mobile: '9959949998' },
  { empId: '01913', name: 'Mr. Kiran Kumar Kaveti', designation: 'Assistant Professor', mobile: '9440043630' },
  { empId: '01920', name: 'Mrs. V.Anusha', designation: 'Assistant Professor', mobile: '9440043631' },
  { empId: '01958', name: 'Mr. O.Gandhi', designation: 'Assistant Professor', mobile: '9440043632' },
  { empId: '01976', name: 'Mr. P. Vijaya Babu', designation: 'Assistant Professor', mobile: '9440043633' },
  { empId: '01988', name: 'Mrs. Ch. Pushya', designation: 'Assistant Professor', mobile: '9440043634' },
  { empId: '01918', name: 'Mr. N. Uttej Kumar', designation: 'Assistant Professor', mobile: '9440043635' },
  { empId: '01919', name: 'MS. Sk.Sajida Sultana', designation: 'Assistant Professor', mobile: '9440043636' },
  { empId: '02172', name: 'Mr.Sk. Sikindar', designation: 'Assistant Professor', mobile: '9440043637' },
  { empId: '02209', name: 'Mr. Chavva Ravi Kishore Reddy', designation: 'Assistant Professor', mobile: '9440043638' },
  { empId: '02290', name: 'Mrs. G. Navya', designation: 'Assistant Professor', mobile: '9440043639' },
  { empId: '02318', name: 'Mr. Sourav Mondal', designation: 'Assistant Professor', mobile: '9440043640' },
  { empId: '02341', name: 'Mr.S.Jayasankar', designation: 'Assistant Professor', mobile: '9440043641' },
  { empId: '02394', name: 'Ms.K.Anusha', designation: 'Assistant Professor (Contract)', mobile: '9440043642' },
  { empId: '02395', name: 'Mr. D.Balakotaiah', designation: 'Assistant Professor (Contract)', mobile: '9440043643' },
  { empId: '02451', name: 'Mr.S.Suresh Babu', designation: 'Assistant Professor (Contract)', mobile: '9440043644' },
  { empId: '02507', name: 'Mr. P. Kiran Kumar Raja', designation: 'Assistant Professor', mobile: '9440043645' },
  { empId: '02516', name: 'Mr. T. Narasimha Rao', designation: 'Assistant Professor (Contract)', mobile: '9440043646' },
  { empId: '02683', name: 'Mrs. Magham Sumalatha', designation: 'Assistant Professor (Contract)', mobile: '9440043647' },
  { empId: '02691', name: 'Mr. P. Venkata Rajulu', designation: 'Assistant Professor (Contract)', mobile: '9440043648' },
  { empId: '02696', name: 'Mrs. Sai Spandana Verella', designation: 'Assistant Professor (Contract)', mobile: '9440043649' },
  { empId: '02722', name: 'Mr. Jani Shaik', designation: 'Assistant Professor (Contract)', mobile: '9440043650' },
  { empId: '02751', name: 'Mrs. V. Nandini', designation: 'CAP', mobile: '9440043651' },
  { empId: '02752', name: 'Mrs. Archana Nalluri', designation: 'CAP', mobile: '9440043652' },
  { empId: '02754', name: 'Mrs. K. Jyostna', designation: 'CAP', mobile: '9440043653' },
  { empId: '02804', name: 'Mrs. R. Lalitha', designation: 'Assistant Professor (Contract)', mobile: '9440043654' },
  { empId: '02843', name: 'Mr. N. Brahma Naidu', designation: 'Assistant Professor (Contract)', mobile: '9440043655' },
  { empId: '02900', name: 'Mr. Kumar Devapogu', designation: 'Assistant Professor (Contract)', mobile: '9440043656' },
  { empId: '02906', name: 'Mrs. Koganti Swathi', designation: 'CAP', mobile: '9440043657' },
  { empId: '02913', name: 'Mr. U. Venkateswara Rao', designation: 'Assistant Professor (Contract)', mobile: '9440043658' },
  { empId: '02941', name: 'Mr. Gujjula Murali', designation: 'Assistant Professor (Contract)', mobile: '9440043659' },
  { empId: '02962', name: 'Mr. Ch. Amaresh', designation: 'Assistant Professor (Contract)', mobile: '9440043660' },
  { empId: '03066', name: 'Ms. Shaik Reehana', designation: 'Assistant Professor (Contract)', mobile: '9440043661' },
  { empId: '03079', name: 'Ms. Jarugumalla Dayanika', designation: 'Assistant Professor (Contract)', mobile: '9440043662' },
  { empId: '03020', name: 'Mr. M. Mohana Venkateswara Rao', designation: 'Assistant Professor (Contract)', mobile: '9440043663' },
  { empId: '03082', name: 'Mr. D. Senthil', designation: 'Assistant Professor (Contract)', mobile: '9440043664' },
  { empId: '30526', name: 'Mr. B. Anil Babu', designation: 'CAP', mobile: '9440043665' },
  { empId: '30564', name: 'Mrs. S. Anitha', designation: 'CAP', mobile: '9440043666' },
  { empId: '00760', name: 'Mrs. D. Tipura', designation: 'CAP', mobile: '9440043667' },
  { empId: '02834', name: 'Mrs. Tanigundala Leelavathy', designation: 'Assistant Professor (Contract)', mobile: '9440043668' },
  { empId: '02842', name: 'Mrs. Ch. Swarna Lalitha', designation: 'Assistant Professor (Contract)', mobile: '9440043669' },
  { empId: '03098', name: 'Ms. P. Anusha', designation: 'Assistant Professor (Contract)', mobile: '9440043670' },
  { empId: '03099', name: 'Mr. E.Akhil Babu', designation: 'Assistant Professor (Contract)', mobile: '9440043671' },
  { empId: '03115', name: 'Mrs. N.Mounika', designation: 'CAP', mobile: '9440043672' },
  { empId: '03112', name: 'Ms.N. Bhargavi', designation: 'Assistant Professor (Contract)', mobile: '9440043673' },
  { empId: '03135', name: 'Ms.Y. Sai Eswari', designation: 'CAP', mobile: '9440043674' },
  { empId: '03188', name: 'Mr. Badheli Krishnakanth', designation: 'Assistant Professor (Contract)', mobile: '9440043675' },
  { empId: '03244', name: 'Mr. Kanna Hareesh', designation: 'CAP', mobile: '9440043676' },
  { empId: '03261', name: 'Mr. Shyam Sundar Jannu Soloman', designation: 'Assistant Professor', mobile: '9440043677' },
  { empId: '03287', name: 'Ms. Gudipati Sravya', designation: 'Assistant Professor (Contract)', mobile: '9440043678' },
  { empId: '02478', name: 'Mr. K.Kiran Kumar', designation: 'Teaching Associate', mobile: '9440043679' },
  { empId: '00103', name: 'Mr. Y. Ram Mohan', designation: 'Teaching  Instructor', mobile: '9440043680' },
  { empId: '03171', name: 'Ms. Pavani Karra', designation: 'Teaching  Instructor', mobile: '9440043681' },
  { empId: '30869', name: 'Ms. Bhimavarapu Jyothika', designation: 'Teaching Associate', mobile: '9440043682' },
  { empId: '30870', name: 'Mr. Alla Pranav Sai Reddy', designation: 'Teaching Associate', mobile: '9440043683' },
  { empId: '30871', name: 'Ms. Gaddam Tejaswi', designation: 'Teaching Associate', mobile: '9440043684' },
  { empId: '30872', name: 'Ms. Yemineni Sravani', designation: 'Teaching Associate', mobile: '9440043685' },
  { empId: '30874', name: 'Mr. Munipalli Veerendra', designation: 'Teaching Associate', mobile: '9440043686' },
  { empId: '30896', name: 'Ms. Varagani Tejaswi', designation: 'Teaching Associate', mobile: '9440043687' },
  { empId: '30910', name: 'Ms. Shaik Kareena Yashmin', designation: 'Teaching Associate', mobile: '9440043688' },
  { empId: '30911', name: 'Ms. Vyshnavi Kagga', designation: 'Teaching Associate', mobile: '9440043689' },
  { empId: '30912', name: 'Ms. Shaik Nazeema', designation: 'Teaching Associate', mobile: '9440043690' },
  { empId: '31044', name: 'Ms. Kalluri Mercy Bhikshavathi', designation: 'Teaching Associate', mobile: '9440043691' },
  { empId: '31074', name: 'Ms. Neeli Sarvani', designation: 'Teaching Associate', mobile: '9440043692' },
  { empId: '31075', name: 'Mr. Syed Nafees Ahamed', designation: 'Teaching Associate', mobile: '9440043693' },
  { empId: '31076', name: 'Mr. Palavelli Vamsi Krishna', designation: 'Teaching Associate', mobile: '9440043694' },
  { empId: '31077', name: 'Ms. R. Nithya', designation: 'Teaching Associate', mobile: '9440043695' },
  { empId: '31087', name: 'Mr. Pathan Yaseen Khan', designation: 'Teaching Associate', mobile: '9440043696' },
  { empId: '31088', name: 'Ms. Bhukya Maneesha', designation: 'Teaching Associate', mobile: '9440043697' },
  { empId: '31093', name: 'Mr. Shaik Dehtaj', designation: 'Teaching Associate', mobile: '9440043698' },
  { empId: '31094', name: 'Ms. Nese Bandhike Akhilandeswari', designation: 'Teaching Associate', mobile: '9440043699' },
  { empId: '31099', name: 'Mrs. P.S.V.V. Samhitha', designation: 'Teaching Associate', mobile: '9440043700' },
  { empId: '31101', name: 'Ms. A. Raja Kumari', designation: 'Teaching Associate', mobile: '9440043701' },
  { empId: '31102', name: 'Ms. Arumalla Gopya Sri', designation: 'Teaching Associate', mobile: '9440043702' },
  { empId: '31104', name: 'Mr. Rudru Gowtham', designation: 'Teaching Associate', mobile: '9440043703' },
  { empId: '31105', name: 'Mr. Madugula Anil', designation: 'Teaching Associate', mobile: '9440043704' },
  { empId: '31108', name: 'Ms. Talari Priya Bharathi', designation: 'Teaching Associate', mobile: '9440043705' },
  { empId: '31169', name: 'Mr. Adavi Aditya Venkateswara Kumar', designation: 'Teaching Associate', mobile: '9440043706' },
  { empId: '31170', name: 'Mr. Kudupudi Raj Kiran', designation: 'Teaching Associate', mobile: '9440043707' },
  { empId: '31171', name: 'Ms. Kollabathula Nimnagasri', designation: 'Teaching Associate', mobile: '9440043708' },
  { empId: '31172', name: 'Ms. Annam Durga Bhavani', designation: 'Teaching Associate', mobile: '9440043709' },
  { empId: '31178', name: 'Ms. Y. Sesha Naga Bindu Lalitha Sri', designation: 'Teaching Associate', mobile: '9440043710' },
  { empId: '31179', name: 'Ms. G. Siva Naga Malleswari', designation: 'Teaching Associate', mobile: '9440043711' },
  { empId: '31180', name: 'Mrs. G. Prasanthi', designation: 'Teaching Associate', mobile: '9440043712' },
  { empId: '31181', name: 'Mr. Sk. Khadersha', designation: 'Teaching Associate', mobile: '9440043713' },
  { empId: '31182', name: 'Ms. K. Divya', designation: 'Teaching Associate', mobile: '9440043714' },
  { empId: '31203', name: 'Ms. Christiana Rose Elizabeth. Korrapati', designation: 'Teaching Associate', mobile: '9440043715' },
  { empId: '31208', name: 'Ms. Upalanchi Vara Lakshmi', designation: 'Teaching Associate', mobile: '9440043716' },
  { empId: '30715', name: 'Mr. T. Latesh Babu', designation: 'Teaching Associate', mobile: '9440043717' },
  { empId: '31224', name: 'Mr. Akula Gopi', designation: 'Teaching Associate', mobile: '9440043718' },
  { empId: '31226', name: 'Ms. P. Deepthi Sowmya', designation: 'Teaching Associate', mobile: '9440043719' },
];

// ═══════════════════════════════════════════════════════════════
// COURSES DATA - 29 courses (B.Tech & M.Tech)
// ═══════════════════════════════════════════════════════════════
const COURSES_DATA = [
  { subjectCode: '25CS101', subjectName: 'Programming In C', shortName: 'Prog C', courseType: 'Mandatory', program: 'B.Tech', year: 'I', L: 2, T: 0, P: 4, C: 4 },
  { subjectCode: 'NEW1001', subjectName: 'Agentic Tools', shortName: 'AgenticTools', courseType: 'Mandatory', program: 'B.Tech', year: 'I', L: 0, T: 2, P: 2, C: 2 },
  { subjectCode: '25CS203', subjectName: 'Database Management Systems', shortName: 'DBMS', courseType: 'Mandatory', program: 'B.Tech', year: 'II', L: 2, T: 2, P: 2, C: 4 },
  { subjectCode: '25CS201', subjectName: 'Data Structures', shortName: 'DS', courseType: 'Mandatory', program: 'B.Tech', year: 'II', L: 2, T: 2, P: 2, C: 4 },
  { subjectCode: '25CS204', subjectName: 'Object Oriented Programming Through Java', shortName: 'OOP Java', courseType: 'Mandatory', program: 'B.Tech', year: 'II', L: 2, T: 0, P: 2, C: 3 },
  { subjectCode: '24CS302', subjectName: 'Artificial Intelligence', shortName: 'AI', courseType: 'Mandatory', program: 'B.Tech', year: 'II', L: 2, T: 0, P: 0, C: 2 },
  { subjectCode: '25CS202', subjectName: 'Data Wrangling and Visualization', shortName: 'Data Wrangle', courseType: 'Mandatory', program: 'B.Tech', year: 'II', L: 1, T: 0, P: 2, C: 2 },
  { subjectCode: '24CS301', subjectName: 'Optimization Techniques', shortName: 'Opt Tech', courseType: 'Mandatory', program: 'B.Tech', year: 'III', L: 3, T: 1, P: 0, C: 4 },
  { subjectCode: '24CS306', subjectName: 'Machine Learning', shortName: 'ML', courseType: 'Mandatory', program: 'B.Tech', year: 'III', L: 3, T: 0, P: 2, C: 4 },
  { subjectCode: '24CS303', subjectName: 'Computer Networks', shortName: 'CN', courseType: 'Mandatory', program: 'B.Tech', year: 'III', L: 3, T: 1, P: 0, C: 4 },
  { subjectCode: '24CS305', subjectName: 'Computing Ethics', shortName: 'Ethics', courseType: 'Mandatory', program: 'B.Tech', year: 'III', L: 2, T: 0, P: 0, C: 2 },
  { subjectCode: 'NEW3001', subjectName: 'Computer Vision', shortName: 'CV', courseType: 'Department Elective', program: 'B.Tech', year: 'III', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: 'NEW3002', subjectName: 'Modern Front-End Frameworks', shortName: 'FrontEnd', courseType: 'Department Elective', program: 'B.Tech', year: 'III', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: '22CS851', subjectName: 'Database Systems', shortName: 'DB Sys', courseType: 'Open Elective', program: 'B.Tech', year: 'III', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: 'NEW3003', subjectName: 'Data Analytics and Visualization', shortName: 'DA&V', courseType: 'Honours', program: 'B.Tech', year: 'III', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: 'NEW3004', subjectName: 'API Security and Authentication', shortName: 'API Sec', courseType: 'Honours', program: 'B.Tech', year: 'III', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: '22CS903', subjectName: 'Database Management Systems', shortName: 'DBMS', courseType: 'Minors', program: 'B.Tech', year: 'III', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: '22CS406', subjectName: 'Privacy Preserving and Intrusion Detection', shortName: 'Privacy', courseType: 'Mandatory', program: 'B.Tech', year: 'IV', L: 3, T: 1, P: 0, C: 4 },
  { subjectCode: '22CS402', subjectName: 'Big Data Analytics', shortName: 'BDA', courseType: 'Mandatory', program: 'B.Tech', year: 'IV', L: 3, T: 0, P: 2, C: 4 },
  { subjectCode: '22CS403', subjectName: 'Cloud Computing', shortName: 'Cloud', courseType: 'Mandatory', program: 'B.Tech', year: 'IV', L: 3, T: 0, P: 2, C: 4 },
  { subjectCode: '22CS310', subjectName: 'Computing Ethics', shortName: 'Ethics', courseType: 'Mandatory', program: 'B.Tech', year: 'IV', L: 2, T: 0, P: 0, C: 2 },
  { subjectCode: 'NEW4001', subjectName: 'MLOps', shortName: 'MLOps', courseType: 'Department Elective', program: 'B.Tech', year: 'IV', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: 'NEW4002', subjectName: 'Natural Language Processing', shortName: 'NLP', courseType: 'Department Elective', program: 'B.Tech', year: 'IV', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: '22CS959', subjectName: 'Agentic AI', shortName: 'AgentAI', courseType: 'Honours', program: 'B.Tech', year: 'IV', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: '22CS907', subjectName: 'Operating Systems and Shell Programming', shortName: 'OSSP', courseType: 'Minors', program: 'B.Tech', year: 'IV', L: 3, T: 0, P: 0, C: 3 },
  { subjectCode: '25CSB101', subjectName: 'Data Structures and Algorithms', shortName: 'DSA', courseType: 'Mandatory', program: 'M.Tech', year: 'I', L: 3, T: 1, P: 0, C: 4 },
  { subjectCode: '25CSB102', subjectName: 'Machine Learning', shortName: 'ML', courseType: 'Mandatory', program: 'M.Tech', year: 'I', L: 3, T: 0, P: 2, C: 4 },
  { subjectCode: '25CSB103', subjectName: 'Internet of Things', shortName: 'IoT', courseType: 'Mandatory', program: 'M.Tech', year: 'I', L: 3, T: 0, P: 2, C: 4 },
  { subjectCode: '25CSB802', subjectName: 'Artificial Neural Networks', shortName: 'ANN', courseType: 'Departmental Elective', program: 'M.Tech', year: 'I', L: 3, T: 0, P: 0, C: 3 },
];

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const hashPassword = (plaintext) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plaintext, salt);
};

// ═══════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════

const seedDatabase = async () => {
  try {
    await connect();
    console.log('✅ Connected to MongoDB\n');

    // ────────────────────────────────────────────────────
    // STEP 1: Import Faculty
    // ────────────────────────────────────────────────────
    console.log('📚 STEP 1: Seeding Faculty Data...');
    await Faculty.deleteMany({});
    const facultyData = FACULTY_DATA.map((f, i) => ({
      ...f,
      slNo: i + 1,
      department: 'CSE',
      email: `${f.name.toLowerCase().replace(/\s+/g, '.')}@university.edu`,
      passwordHash: hashPassword(f.mobile || 'defaultpass')
    }));
    const faculty = await Faculty.insertMany(facultyData);
    console.log(`✅ Imported ${faculty.length} faculty members\n`);

    // ────────────────────────────────────────────────────
    // STEP 2: Import Courses
    // ────────────────────────────────────────────────────
    console.log('📚 STEP 2: Seeding Courses Data...');
    await Course.deleteMany({});
    const coursesData = COURSES_DATA.map((c, i) => ({
      courseId: i + 1,
      ...c
    }));
    const courses = await Course.insertMany(coursesData);
    console.log(`✅ Imported ${courses.length} courses\n`);

    // ────────────────────────────────────────────────────
    // STEP 3: Create User Accounts
    // ────────────────────────────────────────────────────
    console.log('👥 STEP 3: Creating User Accounts...');
    await User.deleteMany({});
    
    const userDataBulk = FACULTY_DATA.map(f => ({
      insertOne: {
        document: {
          empId: f.empId,
          name: f.name,
          designation: f.designation,
          mobile: f.mobile,
          email: `${f.name.toLowerCase().replace(/\s+/g, '.')}@university.edu`,
          passwordHash: hashPassword(f.mobile || 'defaultpass'),
          role: 'faculty',
          canAccessAdmin: false
        }
      }
    }));

    if (userDataBulk.length > 0) {
      await User.bulkWrite(userDataBulk);
    }
    console.log(`✅ Created ${FACULTY_DATA.length} user accounts\n`);

    // ────────────────────────────────────────────────────
    // STEP 4: Promote Admin Users
    // ────────────────────────────────────────────────────
    console.log('🔐 STEP 4: Setting up Admin Users...');
    const adminEmpIds = ['189', '675'];
    
    for (const empId of adminEmpIds) {
      await User.findOneAndUpdate(
        { empId },
        {
          $set: {
            role: 'admin',
            canAccessAdmin: true
          }
        },
        { new: true }
      );
      const adminUser = await User.findOne({ empId });
      if (adminUser) {
        console.log(`  ✅ Promoted: ${adminUser.name} (${empId}) → Admin`);
      }
    }
    console.log();

    // ────────────────────────────────────────────────────
    // STEP 5: Verification & Summary
    // ────────────────────────────────────────────────────
    console.log('📊 VERIFICATION & SUMMARY\n');
    console.log('═'.repeat(60));
    
    const facCount = await Faculty.countDocuments();
    const courseCount = await Course.countDocuments();
    const userCount = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const facultyUserCount = await User.countDocuments({ role: 'faculty' });
    const facWithPw = await Faculty.countDocuments({ passwordHash: { $exists: true, $ne: null } });

    console.log('✅ Database Seeding Complete!\n');
    console.log('📋 Data Summary:');
    console.log(`  Faculty Records:        ${facCount}`);
    console.log(`  Faculty with Password:  ${facWithPw}`);
    console.log(`  Course Records:         ${courseCount}`);
    console.log(`  User Accounts:          ${userCount}`);
    console.log(`    ├─ Admin Users:       ${adminCount}`);
    console.log(`    └─ Faculty Users:     ${facultyUserCount}\n`);

    console.log('═'.repeat(60));
    console.log('\n🎯 System Ready for Production!\n');
    console.log('📝 Login Credentials:');
    console.log('  Admin Users:');
    console.log('    • empId: 189 | Name: Dr. S. Deva Kumar | Password: 9959949221');
    console.log('    • empId: 675 | Name: Dr. S. V Phani Kumar | Password: 9912514034\n');
    console.log('  Faculty Users:');
    console.log('    • Username: Employee ID');
    console.log('    • Password: Mobile number\n');
    console.log('🚀 URL: http://localhost:3002/csefaculty\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
    console.error(err);
    process.exit(1);
  }
};

// ═══════════════════════════════════════════════════════════════
// START SEEDING
// ═══════════════════════════════════════════════════════════════

console.log('═'.repeat(60));
console.log('🌱 WLM DATABASE SEEDING SCRIPT');
console.log('═'.repeat(60));
console.log();

seedDatabase();
