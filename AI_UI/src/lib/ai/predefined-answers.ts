
interface PredefinedEntry {
  /** Keywords / phrases that trigger this answer (all lowercased) */
  keywords: string[];
  answer: string;
}

const PREDEFINED_QA: PredefinedEntry[] = [
  // ── 1. Operating System ────────────────────────────────────────
  {
    keywords: [
      'what is an operating system',
      'what is operating system',
      'explain operating system',
      'define operating system',
      'what is os',
      'explain os',
    ],
    answer: `# What is an Operating System?

An Operating System (OS) is the most fundamental system software in a computer. It acts as a bridge between the computer hardware and the user. Without an operating system, a computer would be like an orchestra with instruments but no conductor. The OS coordinates everything so programs, memory, storage devices, and input/output hardware work together smoothly.

Popular operating systems include:

* Windows
* Linux
* macOS
* Android

The operating system performs several important functions:

### 1. Process Management

A process is a program in execution. The OS manages multiple processes simultaneously using scheduling algorithms. It allocates CPU time to different applications so users can multitask efficiently.

For example:

* Listening to music
* Browsing the internet
* Downloading files
* Running code in an IDE

All these can happen simultaneously because the operating system schedules CPU resources intelligently.

### 2. Memory Management

The OS handles RAM allocation and deallocation. It ensures one process does not interfere with another process's memory space.

Concepts involved:

* Virtual memory
* Paging
* Segmentation
* Swapping

### 3. File Management

The OS organizes data into files and directories. It controls:

* File creation
* File deletion
* File permissions
* Storage allocation

File systems include:

* NTFS
* FAT32
* ext4

### 4. Device Management

The operating system communicates with hardware devices through device drivers.

Examples:

* Printer drivers
* Graphics drivers
* Audio drivers

Without drivers, hardware components become expensive decorative bricks.

### 5. Security and Protection

Modern operating systems provide:

* User authentication
* Encryption
* Firewall management
* Access control

### 6. User Interface

Operating systems provide:

* Command Line Interface (CLI)
* Graphical User Interface (GUI)

Examples:

* Linux terminal
* Windows desktop interface

### Types of Operating Systems

* Batch OS
* Time-sharing OS
* Distributed OS
* Real-time OS
* Network OS

### Advantages of Operating Systems

* Efficient resource utilization
* Easier user interaction
* Multitasking support
* Hardware abstraction

### Disadvantages

* Security vulnerabilities
* High complexity
* Resource consumption

In conclusion, the operating system is the backbone of computer functionality. Every application, browser, game, or coding environment depends on it. It transforms raw hardware into a usable digital ecosystem.`,
  },

  // ── 2. Compiler vs Interpreter ─────────────────────────────────
  {
    keywords: [
      'difference between compiler and interpreter',
      'compiler vs interpreter',
      'compiler and interpreter',
      'what is compiler and interpreter',
      'explain compiler and interpreter',
      'compare compiler and interpreter',
      'compiler versus interpreter',
    ],
    answer: `# Difference Between Compiler and Interpreter

A compiler and an interpreter are both language translators used to convert high-level programming languages into machine-readable instructions. However, they differ significantly in the way they perform translation and execution.

## Compiler

A compiler translates the entire source code into machine code before execution.

Examples:

* GCC
* Clang

### Working Process

1. Source code is written.
2. Entire program is compiled.
3. Executable file is generated.
4. Executable runs independently.

### Advantages

* Faster execution speed
* Better optimization
* Errors displayed together
* Executable can run without source code

### Disadvantages

* Compilation takes time
* Platform dependency

Languages using compilers:

* C
* C++
* Rust

---

## Interpreter

An interpreter translates and executes code line by line.

Examples:

* Python
* Node.js

### Working Process

1. Reads one statement
2. Translates it
3. Executes immediately
4. Moves to next line

### Advantages

* Easier debugging
* Platform independent
* Faster development cycle

### Disadvantages

* Slower execution
* Requires interpreter every time

Languages using interpreters:

* Python
* JavaScript
* Ruby

---

## Major Differences

| Compiler                       | Interpreter              |
| ------------------------------ | ------------------------ |
| Translates whole program       | Translates line by line  |
| Generates executable           | No executable generated  |
| Faster execution               | Slower execution         |
| Errors shown after compilation | Errors shown immediately |
| Better optimization            | Less optimization        |

### Hybrid Approach

Some languages use both compilation and interpretation.

Example:

* Java

Java source code is compiled into bytecode, then interpreted or JIT-compiled by JVM.`,
  },

  // ── 3. DBMS ────────────────────────────────────────────────────
  {
    keywords: [
      'what is dbms',
      'what is database management system',
      'explain dbms',
      'define dbms',
      'database management system',
    ],
    answer: `# What is DBMS?

A Database Management System (DBMS) is software that allows users to create, manage, store, retrieve, and manipulate data efficiently.

Popular DBMS software:

* MySQL
* Oracle Database
* MongoDB
* PostgreSQL

---

## Need for DBMS

Before DBMS, data was stored in file systems which caused:

* Data redundancy
* Data inconsistency
* Difficult searching
* Security problems

DBMS solved these issues systematically.

---

## Functions of DBMS

### 1. Data Storage

Stores huge amounts of structured data.

### 2. Data Retrieval

Uses queries to fetch information quickly.

Example SQL query:

\`\`\`sql
SELECT * FROM Students;
\`\`\`

### 3. Data Security

Restricts unauthorized access.

### 4. Backup and Recovery

Protects against data loss.

### 5. Concurrency Control

Allows multiple users to access database simultaneously.

---

## Types of DBMS

### 1. Relational DBMS (RDBMS)

Stores data in tables.

Examples:

* MySQL
* Oracle

### 2. NoSQL DBMS

Handles unstructured or semi-structured data.

Examples:

* MongoDB
* Cassandra

### 3. Hierarchical DBMS

Tree-like structure.

### 4. Network DBMS

Graph-based relationships.

---

## Advantages

* Reduced redundancy
* Improved consistency
* Better security
* Data sharing
* Data integrity

## Disadvantages

* Costly setup
* Complexity
* Requires skilled administration

---

## Applications

* Banking systems
* Railway reservation systems
* Hospital management
* E-commerce platforms
* Social media applications

DBMS is essentially the giant invisible librarian of the digital world, tirelessly organizing mountains of data so humans don't drown in spreadsheet chaos.`,
  },

  // ── 4. OOP Concepts ────────────────────────────────────────────
  {
    keywords: [
      'explain oop concepts',
      'what is oop',
      'object oriented programming',
      'oop concepts',
      'explain oop',
      'what are oop concepts',
      'oops concepts',
      'explain oops',
      'what is oops',
    ],
    answer: `# Explain OOP Concepts

Object-Oriented Programming (OOP) is a programming paradigm based on objects and classes. It focuses on organizing software design around real-world entities.

Languages supporting OOP:

* Java
* C++
* Python

---

# Core Concepts of OOP

## 1. Class

A class is a blueprint for creating objects.

Example:
A "Car" class may contain:

* Color
* Speed
* Engine type

---

## 2. Object

An object is an instance of a class.

Example:

* BMW car
* Tesla car

Both are objects created from the Car class.

---

## 3. Encapsulation

Encapsulation means bundling data and methods together.

Benefits:

* Data hiding
* Better security
* Controlled access

Example:
Private variables accessed using getter/setter methods.

---

## 4. Inheritance

Inheritance allows one class to acquire properties of another class.

Example:

* Animal → Parent class
* Dog → Child class

Benefits:

* Code reusability
* Reduced redundancy

---

## 5. Polymorphism

Polymorphism means "many forms."

Types:

* Compile-time polymorphism
* Runtime polymorphism

Example:
A method named \`draw()\` may behave differently for:

* Circle
* Rectangle
* Triangle

---

## 6. Abstraction

Abstraction hides implementation details and shows only functionality.

Example:
When driving a car:

* Driver uses steering wheel and pedals
* Driver does not manage fuel injection timing manually

Programming abstraction works similarly.

---

# Advantages of OOP

* Modularity
* Reusability
* Scalability
* Easier maintenance
* Better organization

# Disadvantages

* Higher complexity
* Larger program size
* Steeper learning curve

---

# Real-World Applications

* Banking systems
* Game development
* GUI applications
* Enterprise software

OOP transformed programming from chaotic instruction jungles into organized digital cities where classes behave like carefully engineered architecture instead of tangled spaghetti vines 🌆`,
  },
];

/**
 * Look up a predefined answer for the given user message.
 * Returns the answer string if matched, or null otherwise.
 */
export function getPredefinedAnswer(message: string): string | null {
  const normalised = message
    .toLowerCase()
    .replace(/[?!.,;:'"]/g, '')
    .trim();

  for (const entry of PREDEFINED_QA) {
    for (const kw of entry.keywords) {
      if (normalised.includes(kw) || normalised === kw) {
        return entry.answer;
      }
    }
  }

  return null;
}
