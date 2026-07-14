/**
 * tests/firestore-rules.test.ts
 *
 * Unit tests for Firestore security rules using the Firebase Emulator Suite.
 *
 * Run: npm run test:rules
 *
 * These tests cover the 8 scenarios described in the implementation plan
 * and act as a regression suite — any change to firestore.rules must keep
 * all tests green before merging.
 *
 * Prerequisites:
 *   - Firebase Emulator Suite installed: npm install -g firebase-tools
 *   - Emulator running: firebase emulators:start --only firestore
 *     OR tests can auto-start it via @firebase/rules-unit-testing helpers.
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { join } from "path";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

// ── Test environment setup ─────────────────────────────────────────────────────

let testEnv: RulesTestEnvironment;

const RULES_PATH = join(__dirname, "..", "firestore.rules");
const PROJECT_ID = "test-expense-tracker";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, "utf8"),
      host:  "127.0.0.1",
      port:  8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ── Helper: create authenticated contexts ─────────────────────────────────────

function authedUser(uid: string, emailVerified = true) {
  return testEnv.authenticatedContext(uid, {
    email_verified: emailVerified,
    email: `${uid}@example.com`,
  });
}

function authedAdmin(uid: string) {
  return testEnv.authenticatedContext(uid, {
    email_verified: true,
    email: `${uid}@example.com`,
    admin: true,
  });
}

function unauthenticated() {
  return testEnv.unauthenticatedContext();
}

// ═════════════════════════════════════════════════════════════════════════════
// Test Suite
// ═════════════════════════════════════════════════════════════════════════════

describe("Firestore Security Rules", () => {

  // ── Scenario 1: Owner can read/write their own subtree ────────────────────
  describe("1. Owner can read/write their own subtree", () => {
    it("allows owner to write their own profile", async () => {
      const ctx = authedUser("user-alice");
      await assertSucceeds(
        setDoc(doc(ctx.firestore(), "users/user-alice"), { displayName: "Alice" })
      );
    });

    it("allows owner to read their own profile", async () => {
      // Seed via admin context (bypass rules)
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "users/user-alice"), { displayName: "Alice" });
      });

      const ctx = authedUser("user-alice");
      await assertSucceeds(getDoc(doc(ctx.firestore(), "users/user-alice")));
    });

    it("allows owner to write a transaction in their subtree", async () => {
      const ctx = authedUser("user-alice");
      await assertSucceeds(
        setDoc(doc(ctx.firestore(), "users/user-alice/transactions/tx-1"), {
          amount: 50,
          type: "expense",
        })
      );
    });
  });

  // ── Scenario 2: Other user cannot read/write another user's subtree ───────
  describe("2. Other authenticated user cannot access another user's subtree", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "users/user-alice"), { displayName: "Alice" });
        await setDoc(doc(ctx.firestore(), "users/user-alice/transactions/tx-1"), {
          amount: 100,
        });
      });
    });

    it("blocks user-bob from reading user-alice's profile", async () => {
      const ctx = authedUser("user-bob");
      await assertFails(getDoc(doc(ctx.firestore(), "users/user-alice")));
    });

    it("blocks user-bob from writing to user-alice's transactions", async () => {
      const ctx = authedUser("user-bob");
      await assertFails(
        setDoc(doc(ctx.firestore(), "users/user-alice/transactions/tx-2"), {
          amount: 999,
        })
      );
    });
  });

  // ── Scenario 3: Unauthenticated user cannot access anything ─────────────
  describe("3. Unauthenticated user cannot access anything", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "users/user-alice"), { displayName: "Alice" });
      });
    });

    it("blocks unauthenticated read of user profile", async () => {
      const ctx = unauthenticated();
      await assertFails(getDoc(doc(ctx.firestore(), "users/user-alice")));
    });

    it("blocks unauthenticated write to any path", async () => {
      const ctx = unauthenticated();
      await assertFails(
        setDoc(doc(ctx.firestore(), "users/user-alice"), { hacked: true })
      );
    });
  });

  // ── Scenario 4: Unverified email cannot access financial data ────────────
  describe("4. Unverified email is blocked from financial data", () => {
    it("blocks unverified user from writing their profile", async () => {
      const ctx = authedUser("user-unverified", false /* emailVerified=false */);
      await assertFails(
        setDoc(doc(ctx.firestore(), "users/user-unverified"), {
          displayName: "Unverified",
        })
      );
    });

    it("blocks unverified user from reading their own transactions", async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "users/user-unverified/transactions/tx-1"),
          { amount: 50 }
        );
      });

      const ctx = authedUser("user-unverified", false);
      await assertFails(
        getDoc(doc(ctx.firestore(), "users/user-unverified/transactions/tx-1"))
      );
    });
  });

  // ── Scenario 5: Admin can read/write admin collection ───────────────────
  describe("5. Admin can read/write admin collection", () => {
    it("allows admin to write to admin collection", async () => {
      const ctx = authedAdmin("admin-user");
      await assertSucceeds(
        setDoc(doc(ctx.firestore(), "admin/meta"), { userCount: 42 })
      );
    });

    it("allows admin to read admin collection", async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "admin/meta"), { userCount: 42 });
      });

      const ctx = authedAdmin("admin-user");
      await assertSucceeds(getDoc(doc(ctx.firestore(), "admin/meta")));
    });
  });

  // ── Scenario 6: Non-admin cannot access admin collection ─────────────────
  describe("6. Non-admin cannot access admin collection", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "admin/meta"), { userCount: 1 });
      });
    });

    it("blocks regular user from reading admin collection", async () => {
      const ctx = authedUser("user-alice");
      await assertFails(getDoc(doc(ctx.firestore(), "admin/meta")));
    });

    it("blocks regular user from writing to admin collection", async () => {
      const ctx = authedUser("user-alice");
      await assertFails(
        setDoc(doc(ctx.firestore(), "admin/meta"), { userCount: 9999 })
      );
    });
  });

  // ── Scenario 7: adminAuditLog is append-only (update/delete blocked) ─────
  describe("7. adminAuditLog is immutable (create OK, update/delete blocked)", () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "adminAuditLog/log-1"), {
          action: "GRANT_ADMIN",
          performedBy: "admin-user",
        });
      });
    });

    it("allows admin to create an audit log entry", async () => {
      const ctx = authedAdmin("admin-user");
      await assertSucceeds(
        addDoc(collection(ctx.firestore(), "adminAuditLog"), {
          action: "REVOKE_ADMIN",
          performedBy: "admin-user",
        })
      );
    });

    it("blocks admin from updating an audit log entry", async () => {
      const ctx = authedAdmin("admin-user");
      await assertFails(
        updateDoc(doc(ctx.firestore(), "adminAuditLog/log-1"), {
          action: "TAMPERED",
        })
      );
    });

    it("blocks admin from deleting an audit log entry", async () => {
      const ctx = authedAdmin("admin-user");
      await assertFails(
        deleteDoc(doc(ctx.firestore(), "adminAuditLog/log-1"))
      );
    });
  });

  // ── Scenario 8: Feedback create is allowed for verified auth users ────────
  describe("8. Feedback: verified users can create, only admins can read/update/delete", () => {
    it("allows verified user to create feedback", async () => {
      const ctx = authedUser("user-alice");
      await assertSucceeds(
        addDoc(collection(ctx.firestore(), "feedback"), {
          userId: "user-alice",
          message: "Great app!",
        })
      );
    });

    it("blocks unverified user from creating feedback", async () => {
      const ctx = authedUser("user-unverified", false);
      await assertFails(
        addDoc(collection(ctx.firestore(), "feedback"), {
          userId: "user-unverified",
          message: "Test",
        })
      );
    });

    it("blocks regular user from reading feedback", async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "feedback/fb-1"), {
          message: "Some feedback",
        });
      });

      const ctx = authedUser("user-alice");
      await assertFails(getDoc(doc(ctx.firestore(), "feedback/fb-1")));
    });

    it("allows admin to read feedback", async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "feedback/fb-1"), {
          message: "Some feedback",
        });
      });

      const ctx = authedAdmin("admin-user");
      await assertSucceeds(getDoc(doc(ctx.firestore(), "feedback/fb-1")));
    });
  });
});
