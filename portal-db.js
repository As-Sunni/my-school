(function () {
  const STORAGE_KEY = "As-sa'adah-islamic-academy-db";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function defaultDemoData() {
    const now = Date.now();
    return {
      students: [
        {
          id: "stu-001",
          data: {
            name: "Ahmed Bello",
            adm: "SAA/26/001",
            cls: "Primary 1",
            gender: "Male",
            guardianName: "Mrs. Bello",
            guardianPhone: "08012345678",
            createdAt: now,
          },
        },
      ],
      staff: [
        {
          id: "stf-001",
          data: {
            name: "Aisha Bello",
            staffId: "STF-001",
            role: "Teacher",
            subject: "Mathematics",
            classes: "Primary 1",
            phone: "08060000001",
            hash: "72cc02735a0023a7c8d4ed072ba87417c1cfdd3bb2dd8d874c67d68b4a17b134",
            createdAt: now,
          },
        },
      ],
      parents: [
        {
          id: "p08012345678",
          data: {
            name: "Mrs. Bello",
            phone: "08012345678",
            hash: "9f81ada5976b0353fa9d525e75b23a27d1aee8804faf3a5ed6a53ec5281c9d65",
            createdAt: now,
          },
        },
      ],
      finance: {
        "stu-001": {
          balance: 15000,
          history: [
            {
              t: now,
              type: "Opening balance",
              amount: 15000,
              note: "Primary 1 fee record",
            },
          ],
          updatedAt: now,
        },
      },
      records: [
        {
          id: "stu-001__2025_2026__first-term__mathematics",
          data: {
            studentId: "stu-001",
            studentName: "Ahmed Bello",
            cls: "Primary 1",
            session: "2025/2026",
            term: "First Term",
            subject: "Mathematics",
            ca: 30,
            exam: 52,
            total: 82,
            by: "Aisha Bello",
            updatedAt: now,
          },
        },
      ],
      attendance: [
        {
          id: "2025-09-02_primary-1",
          data: {
            date: "2025-09-02",
            cls: "Primary 1",
            marks: {
              "stu-001": "P",
            },
            by: "Aisha Bello",
            updatedAt: now,
          },
        },
      ],
    };
  }

  function readPersistedState() {
    try {
      if (typeof localStorage === "undefined") return null;
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writePersistedState(state) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (error) {
      // ignore storage failures in private or restricted environments
    }
  }

  function normalizeCollection(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      return Object.entries(value).map(([id, data]) => ({ id, data }));
    }
    return [];
  }

  function generateDocId(collectionName, id) {
    if (id) return id;
    const prefix = String(collectionName || "doc")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return `${prefix || "doc"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function toSnapshotList(collectionName, state) {
    const raw = state[collectionName] || [];
    return normalizeCollection(raw).map((item) => ({
      id: item.id,
      data: () => clone(item.data || item),
    }));
  }

  function normalizePhoneNumber(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function isStudentLinkedToParent(student, parentPhone) {
    const targetPhone = normalizePhoneNumber(parentPhone);
    const studentPhones = [
      student && student.guardianPhone,
      student && student.parentPhone,
      student && student.phone,
    ];
    return (
      !!targetPhone &&
      studentPhones.some((phone) => normalizePhoneNumber(phone) === targetPhone)
    );
  }

  function createPortalDatabase(options = {}) {
    const persist = options.persist !== false;
    let state = persist
      ? readPersistedState() || defaultDemoData()
      : defaultDemoData();
    if (!state || typeof state !== "object") {
      state = defaultDemoData();
    }

    function save() {
      if (persist) {
        writePersistedState(state);
      }
    }

    function getCollection(name) {
      if (!state[name]) {
        state[name] = [];
      }
      return state[name];
    }

    function createQuery(collectionName, filters = []) {
      const query = {
        where(field, operator, expectedValue) {
          return createQuery(collectionName, [
            ...filters,
            { field, operator, expectedValue },
          ]);
        },
        get() {
          let list = normalizeCollection(getCollection(collectionName));
          for (const filter of filters) {
            list = list.filter((entry) => {
              const value = entry.data && entry.data[filter.field];
              if (filter.operator === "==")
                return value === filter.expectedValue;
              if (filter.operator === "!=")
                return value !== filter.expectedValue;
              return true;
            });
          }
          return {
            docs: list.map((item) => ({
              id: item.id,
              data: () => clone(item.data || item),
            })),
          };
        },
      };
      return query;
    }

    function getDocFromCollection(collectionName, id) {
      const collection = getCollection(collectionName);
      const list = normalizeCollection(collection);
      return list.find((item) => item.id === id) || null;
    }

    function docRef(collectionName, id) {
      const targetId = generateDocId(collectionName, id);
      return {
        get() {
          const current = getDocFromCollection(collectionName, targetId);
          return {
            exists: !!current,
            id: targetId,
            data() {
              return clone(current ? current.data : {});
            },
          };
        },
        set(data) {
          const collection = getCollection(collectionName);
          if (Array.isArray(collection)) {
            const existing = collection.findIndex(
              (item) => item.id === targetId,
            );
            const record = { id: targetId, data: clone(data) };
            if (existing >= 0) collection[existing] = record;
            else collection.push(record);
          } else if (collection && typeof collection === "object") {
            collection[targetId] = clone(data);
          } else {
            state[collectionName] = { [targetId]: clone(data) };
          }
          save();
          return this;
        },
        update(data) {
          const current = getDocFromCollection(collectionName, targetId);
          const payload = current ? current.data : {};
          const merged = { ...payload, ...clone(data) };
          return this.set(merged);
        },
        delete() {
          const collection = getCollection(collectionName);
          if (!targetId || targetId === "undefined") return false;
          if (Array.isArray(collection)) {
            const index = collection.findIndex((item) => item.id === targetId);
            if (index < 0) return false;
            collection.splice(index, 1);
          } else if (collection && typeof collection === "object") {
            if (!(targetId in collection)) return false;
            delete collection[targetId];
          } else {
            return false;
          }
          save();
          return true;
        },
      };
    }

    const db = {
      collection(name) {
        const collectionApi = {
          get() {
            const list = normalizeCollection(getCollection(name));
            return {
              docs: list.map((item) => ({
                id: item.id,
                data: () => clone(item.data || item),
              })),
            };
          },
          onSnapshot(next, onError) {
            try {
              next({ docs: toSnapshotList(name, state) });
            } catch (error) {
              if (typeof onError === "function") onError(error);
            }
            return () => {};
          },
          doc(id) {
            return docRef(name, id);
          },
          where(field, operator, expectedValue) {
            return createQuery(name, [{ field, operator, expectedValue }]);
          },
        };
        return collectionApi;
      },
      doc(path) {
        const parts = String(path).split("/");
        const collectionName = parts[0];
        const id = parts.slice(1).join("/");
        return docRef(collectionName, id);
      },
      reset() {
        state = defaultDemoData();
        save();
      },
    };

    return db;
  }

  const browserWindow = typeof window !== "undefined" ? window : null;
  if (browserWindow) {
    const db = createPortalDatabase();
    const user = {
      async isOwner() {
        return true;
      },
      name: "School Owner",
    };
    browserWindow.portalDB = {
      createPortalDatabase,
      db,
      user,
      resetDemoData() {
        db.reset();
      },
    };
    browserWindow.claude = {
      use(name) {
        if (name === "db") return db;
        if (name === "user") return user;
        return null;
      },
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      createPortalDatabase,
      defaultDemoData,
      STORAGE_KEY,
      normalizePhoneNumber,
      isStudentLinkedToParent,
    };
  }
})();
