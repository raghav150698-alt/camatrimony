import { D1Database, D1PreparedStatement } from "./index";

export class MockPreparedStatement implements D1PreparedStatement {
  private query: string;
  private bindings: any[] = [];

  constructor(query: string) {
    this.query = query.trim().replace(/\s+/g, " ");
  }

  bind(...values: any[]): D1PreparedStatement {
    this.bindings = values;
    return this;
  }

  // Helper to simulate a simple local database inside memory & localstorage
  private getMockStore(table: string): any[] {
    if (typeof window === "undefined") {
      // In-memory server caching for build environments
      if (!(global as any)._mockDb) (global as any)._mockDb = {};
      if (!(global as any)._mockDb[table]) {
        (global as any)._mockDb[table] = this.getSeedData(table);
      }
      return (global as any)._mockDb[table];
    } else {
      // LocalStorage caching for client testing sandbox
      const key = `mock_db_${table}`;
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
      const seed = this.getSeedData(table);
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
  }

  private saveMockStore(table: string, data: any[]) {
    if (typeof window === "undefined") {
      if (!(global as any)._mockDb) (global as any)._mockDb = {};
      (global as any)._mockDb[table] = data;
    } else {
      localStorage.setItem(`mock_db_${table}`, JSON.stringify(data));
    }
  }

  private getSeedData(table: string): any[] {
    if (table === "packages") {
      return [
        { id: 1, name: "Gold", price: 2999, validity_days: 90, contact_limit: 20, chat_allowed: 1, is_active: 1, is_custom: 0, features: JSON.stringify(["View 20 Contacts", "Direct Chat Connection", "Standard Support", "Validity: 90 Days"]) },
        { id: 2, name: "Diamond", price: 4999, validity_days: 180, contact_limit: 50, chat_allowed: 1, is_active: 1, is_custom: 0, features: JSON.stringify(["View 50 Contacts", "Direct Chat Connection", "Priority Support", "Validity: 180 Days", "Profile Highlighted"]) },
        { id: 3, name: "Platinum", price: 7999, validity_days: 365, contact_limit: 9999, chat_allowed: 1, is_active: 1, is_custom: 0, features: JSON.stringify(["Unlimited Contacts", "Direct Chat Connection", "24/7 Dedicated Support", "Validity: 365 Days", "Assisted Matchmaking", "Horoscope Matching"]) }
      ];
    }
    if (table === "users") {
      return [
        { id: "mock-user-12345", email: "admin@camatrimonybncn.com", phone: "+91 62813 69478", role: "admin", status: "active", banned_at: null, ban_reason: null, notes: "Main super admin profile.", strikes: 0, login_count: 15, last_login_at: new Date().toISOString() },
        { id: "mock-user-phone-54321", email: "finance.pro@example.com", phone: "+91 99999 88888", role: "user", status: "active", banned_at: null, ban_reason: null, notes: "Interested in corporate law profiles.", strikes: 0, login_count: 5, last_login_at: new Date().toISOString() },
        { id: "mock-user-sriya", email: "sriya.k@example.com", phone: "+91 88888 77777", role: "user", status: "active", banned_at: null, ban_reason: null, notes: null, strikes: 0, login_count: 8, last_login_at: new Date().toISOString() },
        { id: "mock-user-rohit", email: "rohit.m@example.com", phone: "+91 99999 44444", role: "user", status: "active", banned_at: null, ban_reason: null, notes: null, strikes: 0, login_count: 12, last_login_at: new Date().toISOString() },
        { id: "mock-user-arpita", email: "arpita.ca@example.com", phone: "+91 88888 12345", role: "user", status: "pending_verification", banned_at: null, ban_reason: null, notes: "Awaiting review of degree certificate.", strikes: 0, login_count: 2, last_login_at: new Date().toISOString() },
        { id: "mock-user-neha", email: "neha.cs@example.com", phone: "+91 77777 12345", role: "user", status: "active", banned_at: null, ban_reason: null, notes: null, strikes: 0, login_count: 9, last_login_at: new Date().toISOString() },
        { id: "mock-user-rohan", email: "rohan.cfa@example.com", phone: "+91 66666 12345", role: "user", status: "active", banned_at: null, ban_reason: null, notes: null, strikes: 0, login_count: 4, last_login_at: new Date().toISOString() }
      ];
    }
    if (table === "profiles") {
      return [
        {
          user_id: "mock-user-12345",
          profile_created_by: "Self",
          gender: "Male",
          diet: "Vegetarian",
          age: 29,
          height: "5ft 10in",
          weight: 74,
          marital_status: "Never Married",
          religion: "Hindu",
          caste: "Brahmin",
          subcaste: "Smartha",
          gothram: "Kasyapa",
          birth_date: "1997-06-15",
          birth_place: "Hyderabad, TS",
          highest_degree: "Chartered Accountant (CA)",
          employed_in: "Private Sector",
          occupation: "Senior Auditor, Big 4",
          annual_income: "₹15 - ₹20 LPA",
          work_location: "Bangalore, KA",
          is_nri: 0,
          family_status: "Upper-Middle Class",
          family_type: "Nuclear",
          is_verified: 1,
          is_featured: 1,
          photos: JSON.stringify(["/success_story_1.png"]),
          about_me: "Passionate Senior Auditor working in a Big 4 firm. Valuing traditional Vedic family ethics along with modern professional career goals.",
          profile_views_count: 142,
          last_active_at: new Date().toISOString()
        },
        {
          user_id: "mock-user-sriya",
          profile_created_by: "Self",
          gender: "Female",
          diet: "Vegetarian",
          age: 27,
          height: "5ft 4in",
          weight: 52,
          marital_status: "Never Married",
          religion: "Hindu",
          caste: "Brahmin",
          subcaste: "Smartha",
          gothram: "Srivatsa",
          birth_date: "1999-09-21",
          birth_place: "Mumbai, MH",
          highest_degree: "CS & MBA Finance",
          employed_in: "Private Sector",
          occupation: "CFO, Tech firm",
          annual_income: "₹25 - ₹30 LPA",
          work_location: "Mumbai, MH",
          is_nri: 0,
          family_status: "Upper Class",
          family_type: "Nuclear",
          is_verified: 1,
          is_featured: 1,
          photos: JSON.stringify(["/success_story_2.png"]),
          about_me: "Dynamic Company Secretary and Chief Financial Officer at a thriving technology startup in Mumbai. Loving light travel and classical music.",
          profile_views_count: 310,
          last_active_at: new Date().toISOString()
        },
        {
          user_id: "mock-user-rohit",
          profile_created_by: "Self",
          gender: "Male",
          diet: "Vegetarian",
          age: 29,
          height: "5ft 10in",
          weight: 72,
          marital_status: "Never Married",
          religion: "Hindu",
          caste: "Reddy",
          subcaste: "Gudati",
          gothram: "Siva",
          birth_date: "1997-03-12",
          birth_place: "Hyderabad, TS",
          highest_degree: "CA, CFA L3",
          employed_in: "Private Sector",
          occupation: "Senior Investment Advisor",
          annual_income: "₹18 - ₹22 LPA",
          work_location: "Bangalore, KA",
          is_nri: 0,
          family_status: "Upper-Middle Class",
          family_type: "Nuclear",
          is_verified: 1,
          is_featured: 1,
          photos: JSON.stringify(["/success_story_1.png"]),
          about_me: "Investment professional double-qualified in CA and CFA. Based in Bangalore, love running marathons and reading.",
          profile_views_count: 98,
          last_active_at: new Date().toISOString()
        },
        {
          user_id: "mock-user-arpita",
          profile_created_by: "Parent",
          gender: "Female",
          diet: "Vegetarian",
          age: 28,
          height: "5ft 5in",
          weight: 55,
          marital_status: "Never Married",
          religion: "Hindu",
          caste: "Brahmin",
          subcaste: "Smartha",
          gothram: "Kasyapa",
          birth_date: "1998-04-10",
          birth_place: "Pune, MH",
          highest_degree: "Chartered Accountant (CA)",
          employed_in: "Private Sector",
          occupation: "Finance Manager, MNC",
          annual_income: "₹15 - ₹20 LPA",
          work_location: "Pune, MH",
          is_nri: 0,
          family_status: "Upper-Middle Class",
          family_type: "Nuclear",
          is_verified: 0,
          is_featured: 0,
          photos: JSON.stringify([]),
          about_me: "Finance manager working with a German MNC in Pune. Independent yet rooted in family values.",
          profile_views_count: 32,
          last_active_at: new Date().toISOString()
        },
        {
          user_id: "mock-user-neha",
          profile_created_by: "Self",
          gender: "Female",
          diet: "Non-Vegetarian",
          age: 26,
          height: "5ft 3in",
          weight: 50,
          marital_status: "Never Married",
          religion: "Hindu",
          caste: "Khatri",
          subcaste: "Sarin",
          gothram: "Vatsa",
          birth_date: "2000-01-05",
          birth_place: "Delhi",
          highest_degree: "Company Secretary (CS)",
          employed_in: "Private Sector",
          occupation: "Compliance Officer",
          annual_income: "₹12 - ₹15 LPA",
          work_location: "Delhi NCR",
          is_nri: 0,
          family_status: "Middle Class",
          family_type: "Nuclear",
          is_verified: 1,
          is_featured: 0,
          photos: JSON.stringify([]),
          about_me: "CS professional working with corporate listings. Energetic, optimistic, family-centric.",
          profile_views_count: 67,
          last_active_at: new Date().toISOString()
        },
        {
          user_id: "mock-user-rohan",
          profile_created_by: "Self",
          gender: "Male",
          diet: "Vegetarian",
          age: 31,
          height: "5ft 11in",
          weight: 78,
          marital_status: "Never Married",
          religion: "Hindu",
          caste: "Vaishya",
          subcaste: "Arya",
          gothram: "Bharadwaja",
          birth_date: "1995-11-20",
          birth_place: "Hyderabad, TS",
          highest_degree: "CFA L3 & MBA",
          employed_in: "Private Sector",
          occupation: "Investment Banker",
          annual_income: "₹35 - ₹40 LPA",
          work_location: "London, UK",
          is_nri: 1,
          family_status: "Upper Class",
          family_type: "Joint",
          is_verified: 1,
          is_featured: 1,
          photos: JSON.stringify([]),
          about_me: "Investment banker in London. Travel enthusiast, foodie, love chess.",
          profile_views_count: 220,
          last_active_at: new Date().toISOString()
        }
      ];
    }
    if (table === "cms_settings") {
      return [
        { setting_key: "logo_url", setting_value: "/logo.png" },
        { setting_key: "support_phone", setting_value: "+91 6281 369 478" },
        { setting_key: "support_email", setting_value: "support@camatrimonybncn.com" },
        { setting_key: "support_address", setting_value: "Hyderabad, Telangana, India." }
      ];
    }
    if (table === "admin_roles") {
      return [
        { user_id: "mock-user-12345", role: "super_admin", assigned_by: "system", assigned_at: new Date().toISOString() }
      ];
    }
    if (table === "user_subscriptions") {
      return [
        { id: 1, user_id: "mock-user-rohit", package_id: 1, start_date: new Date().toISOString(), end_date: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000).toISOString(), status: "active", payment_id: "pay_mock_123" },
        { id: 2, user_id: "mock-user-sriya", package_id: 3, start_date: new Date().toISOString(), end_date: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000).toISOString(), status: "active", payment_id: "pay_mock_456" }
      ];
    }
    if (table === "interest_requests") {
      return [
        { id: 1, sender_id: "mock-user-rohit", receiver_id: "mock-user-sriya", status: "accepted", message: "Hi Sriya, I found your professional profile matching my preferences.", created_at: new Date().toISOString(), responded_at: new Date().toISOString() },
        { id: 2, sender_id: "mock-user-rohan", receiver_id: "mock-user-neha", status: "pending", message: "Hello Neha, I would love to connect and discuss family values.", created_at: new Date().toISOString(), responded_at: null }
      ];
    }
    if (table === "favorites") {
      return [
        { user_id: "mock-user-12345", favorited_user_id: "mock-user-sriya", created_at: new Date().toISOString() },
        { user_id: "mock-user-rohit", favorited_user_id: "mock-user-neha", created_at: new Date().toISOString() }
      ];
    }
    if (table === "notifications") {
      return [
        { id: 1, user_id: "mock-user-sriya", type: "interest", title: "New Match Interest!", body: "Rohit M. has expressed interest in your profile.", is_read: 0, reference_id: "1", created_at: new Date().toISOString() },
        { id: 2, user_id: "mock-user-neha", type: "kyc", title: "KYC Verified!", body: "Your profile documents have been approved by the admin team.", is_read: 0, reference_id: null, created_at: new Date().toISOString() }
      ];
    }
    if (table === "mediation_requests") {
      return [
        { id: 1, requester_id: "mock-user-rohit", target_user_id: "mock-user-sriya", preferred_date: "2026-06-05", preferred_time: "17:30", notes: "Seeking a call scheduled with parents.", status: "approved", admin_notes: "Scheduled video bridge.", assigned_to: "mock-user-12345", created_at: new Date().toISOString() }
      ];
    }
    if (table === "blocked_users") {
      return [];
    }
    if (table === "admin_audit_log") {
      return [
        { id: 1, admin_id: "mock-user-12345", action_type: "VERIFY_KYC", target_type: "user", target_id: "mock-user-sriya", details: JSON.stringify({ oldStatus: "pending_verification", newStatus: "active" }), ip_address: "127.0.0.1", created_at: new Date().toISOString() }
      ];
    }
    if (table === "support_tickets") {
      return [
        { id: 1, user_id: "mock-user-phone-54321", subject: "Unable to unlock matches", category: "Billing", priority: "high", status: "open", messages: JSON.stringify([{ sender: "user", text: "I bought the Gold package but unlocks counter remains 0.", sent_at: new Date().toISOString() }]), assigned_to: null, created_at: new Date().toISOString() }
      ];
    }
    if (table === "contact_unlocks") {
      return [
        { id: 1, user_id: "mock-user-rohit", unlocked_user_id: "mock-user-sriya", unlocked_at: new Date().toISOString() }
      ];
    }
    if (table === "messages") {
      return [];
    }
    if (table === "reports") {
      return [
        { id: 1, reporter_id: "mock-user-sriya", reported_id: "mock-user-rohan", reason: "Fake Profile", details: "Profile photos look like stock images.", status: "open", severity: "medium", admin_notes: null, resolved_by: null, resolved_at: null, created_at: new Date().toISOString() }
      ];
    }
    return [];
  }

  async first<T = any>(colName?: string): Promise<T | null> {
    const { results } = await this.all<T>();
    if (!results || results.length === 0) return null;
    const row = results[0];
    if (colName) return (row as any)[colName] ?? null;
    return row;
  }

  async run<T = any>(): Promise<{ success: boolean; results?: T[]; meta?: any }> {
    return this.all<T>();
  }

  async all<T = any>(): Promise<{ success: boolean; results: T[]; meta?: any }> {
    const q = this.query.toLowerCase();

    // 1. SELECT FROM profiles
    if (q.includes("select") && q.includes("profiles")) {
      const list = this.getMockStore("profiles");
      if (q.includes("user_id =")) {
        const userId = this.bindings[0];
        const match = list.find((p: any) => p.user_id === userId);
        return { success: true, results: match ? [match as T] : [] };
      }
      return { success: true, results: list as T[] };
    }

    // 2. SELECT FROM packages
    if (q.includes("select") && q.includes("packages")) {
      const list = this.getMockStore("packages") as T[];
      return { success: true, results: list };
    }

    // 3. SELECT FROM users
    if (q.includes("select") && q.includes("users")) {
      const list = this.getMockStore("users");
      if (q.includes("id =")) {
        const userId = this.bindings[0];
        const match = list.find((u: any) => u.id === userId);
        return { success: true, results: match ? [match as T] : [] };
      }
      return { success: true, results: list as T[] };
    }

    // 4. SELECT FROM contact_unlocks
    if (q.includes("select") && q.includes("contact_unlocks")) {
      const list = this.getMockStore("contact_unlocks");
      if (q.includes("user_id =") && q.includes("unlocked_user_id =")) {
        const userId = this.bindings[0];
        const targetUserId = this.bindings[1];
        const match = list.find((un: any) => un.user_id === userId && un.unlocked_user_id === targetUserId);
        return { success: true, results: match ? [match as T] : [] };
      }
      if (q.includes("user_id =")) {
        const userId = this.bindings[0];
        const filtered = list.filter((un: any) => un.user_id === userId);
        return { success: true, results: filtered as T[] };
      }
      return { success: true, results: list as T[] };
    }

    // 5. SELECT FROM cms_settings
    if (q.includes("select") && q.includes("cms_settings")) {
      const list = this.getMockStore("cms_settings");
      if (q.includes("setting_key =")) {
        const key = this.bindings[0];
        const match = list.find((s: any) => s.setting_key === key);
        return { success: true, results: match ? [match as T] : [] };
      }
      return { success: true, results: list as T[] };
    }

    // 6. SELECT FROM messages or reports
    if (q.includes("select") && q.includes("messages")) {
      const list = this.getMockStore("messages") as T[];
      return { success: true, results: list };
    }
    if (q.includes("select") && q.includes("reports")) {
      const list = this.getMockStore("reports") as T[];
      return { success: true, results: list };
    }

    // 7. SELECT FROM new tables
    if (q.includes("select") && q.includes("admin_roles")) {
      const list = this.getMockStore("admin_roles");
      if (q.includes("user_id =")) {
        const userId = this.bindings[0];
        const match = list.find((u: any) => u.user_id === userId);
        return { success: true, results: match ? [match as T] : [] };
      }
      return { success: true, results: list as T[] };
    }
    if (q.includes("select") && q.includes("user_subscriptions")) {
      const list = this.getMockStore("user_subscriptions");
      if (q.includes("user_id =")) {
        const userId = this.bindings[0];
        const filtered = list.filter((s: any) => s.user_id === userId);
        return { success: true, results: filtered as T[] };
      }
      return { success: true, results: list as T[] };
    }
    if (q.includes("select") && q.includes("interest_requests")) {
      const list = this.getMockStore("interest_requests");
      if (q.includes("sender_id =") && q.includes("receiver_id =")) {
        const senderId = this.bindings[0];
        const receiverId = this.bindings[1];
        const match = list.find((i: any) => i.sender_id === senderId && i.receiver_id === receiverId);
        return { success: true, results: match ? [match as T] : [] };
      }
      if (q.includes("sender_id =")) {
        const senderId = this.bindings[0];
        const filtered = list.filter((i: any) => i.sender_id === senderId);
        return { success: true, results: filtered as T[] };
      }
      if (q.includes("receiver_id =")) {
        const receiverId = this.bindings[0];
        const filtered = list.filter((i: any) => i.receiver_id === receiverId);
        return { success: true, results: filtered as T[] };
      }
      return { success: true, results: list as T[] };
    }
    if (q.includes("select") && q.includes("favorites")) {
      const list = this.getMockStore("favorites");
      if (q.includes("user_id =")) {
        const userId = this.bindings[0];
        const filtered = list.filter((f: any) => f.user_id === userId);
        return { success: true, results: filtered as T[] };
      }
      return { success: true, results: list as T[] };
    }
    if (q.includes("select") && q.includes("notifications")) {
      const list = this.getMockStore("notifications");
      if (q.includes("user_id =")) {
        const userId = this.bindings[0];
        const filtered = list.filter((n: any) => n.user_id === userId);
        return { success: true, results: filtered as T[] };
      }
      return { success: true, results: list as T[] };
    }
    if (q.includes("select") && q.includes("mediation_requests")) {
      const list = this.getMockStore("mediation_requests");
      if (q.includes("requester_id =")) {
        const requesterId = this.bindings[0];
        const filtered = list.filter((m: any) => m.requester_id === requesterId);
        return { success: true, results: filtered as T[] };
      }
      return { success: true, results: list as T[] };
    }
    if (q.includes("select") && q.includes("blocked_users")) {
      const list = this.getMockStore("blocked_users");
      if (q.includes("blocker_id =")) {
        const blockerId = this.bindings[0];
        const filtered = list.filter((b: any) => b.blocker_id === blockerId);
        return { success: true, results: filtered as T[] };
      }
      return { success: true, results: list as T[] };
    }
    if (q.includes("select") && q.includes("admin_audit_log")) {
      const list = this.getMockStore("admin_audit_log") as T[];
      return { success: true, results: list };
    }
    if (q.includes("select") && q.includes("support_tickets")) {
      const list = this.getMockStore("support_tickets");
      if (q.includes("user_id =")) {
        const userId = this.bindings[0];
        const filtered = list.filter((t: any) => t.user_id === userId);
        return { success: true, results: filtered as T[] };
      }
      return { success: true, results: list as T[] };
    }

    // 8. INSERT / REPLACE / UPDATE INTO
    if (q.includes("insert") || q.includes("replace") || q.includes("update")) {
      
      // Profiles Updates/Replaces
      if (q.includes("profiles")) {
        const list = this.getMockStore("profiles");
        if (q.includes("update") && q.includes("is_verified =")) {
          const isVerified = this.bindings[0];
          const userId = this.bindings[1];
          const idx = list.findIndex((p: any) => p.user_id === userId);
          if (idx >= 0) {
            list[idx].is_verified = isVerified;
            this.saveMockStore("profiles", list);
          }
          return { success: true, results: [] };
        }
        
        // Full replace profile
        const userId = this.bindings[0];
        const record = {
          user_id: userId,
          profile_created_by: this.bindings[1],
          gender: this.bindings[2],
          diet: this.bindings[3],
          age: Number(this.bindings[4]),
          height: this.bindings[5],
          weight: this.bindings[6] ? Number(this.bindings[6]) : null,
          marital_status: this.bindings[7],
          religion: this.bindings[8],
          caste: this.bindings[9],
          subcaste: this.bindings[10],
          gothram: this.bindings[11],
          birth_date: this.bindings[12],
          birth_time: this.bindings[13],
          birth_place: this.bindings[14],
          rasi: this.bindings[15],
          nakshatram: this.bindings[16],
          kuja_dosham: this.bindings[17],
          highest_degree: this.bindings[18],
          employed_in: this.bindings[19],
          occupation: this.bindings[20],
          annual_income: this.bindings[21],
          work_location: this.bindings[22],
          is_nri: this.bindings[23] ? 1 : 0,
          family_status: this.bindings[24],
          family_type: this.bindings[25],
          father_occupation: this.bindings[26],
          mother_occupation: this.bindings[27],
          sibling_count: this.bindings[28] ? Number(this.bindings[28]) : 0,
          partner_age_range: this.bindings[29],
          partner_caste: this.bindings[30],
          partner_education: this.bindings[31],
          partner_income_min: this.bindings[32],
          completion_percentage: this.bindings[33] ? Number(this.bindings[33]) : 0,
          govt_id_file: this.bindings[34],
          degree_file: this.bindings[35],
          photos: this.bindings[36],
          is_verified: this.bindings[37] ?? 0,
          is_featured: this.bindings[38] ?? 0,
          about_me: this.bindings[39] || "Professional CA Matrimony profile.",
          profile_views_count: this.bindings[40] || 0,
          last_active_at: this.bindings[41] || new Date().toISOString(),
        };

        const idx = list.findIndex((p: any) => p.user_id === userId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...record };
        } else {
          list.push(record);
        }
        this.saveMockStore("profiles", list);
        return { success: true, results: [record as T] };
      }

      // Users Updates/Inserts
      if (q.includes("users")) {
        const list = this.getMockStore("users");
        if (q.includes("update") && q.includes("status =")) {
          const status = this.bindings[0];
          const userId = this.bindings[1];
          const idx = list.findIndex((u: any) => u.id === userId);
          if (idx >= 0) {
            list[idx].status = status;
            this.saveMockStore("users", list);
          }
          return { success: true, results: [] };
        }

        const userId = this.bindings[0];
        const email = this.bindings[1];
        const existing = list.find((u: any) => u.id === userId);
        if (!existing) {
          list.push({ id: userId, email, phone: null, role: "user", status: "active", banned_at: null, ban_reason: null, notes: null, strikes: 0, login_count: 1, last_login_at: new Date().toISOString() });
          this.saveMockStore("users", list);
        }
        return { success: true, results: [] };
      }

      // Contact Unlocks Inserts
      if (q.includes("contact_unlocks")) {
        const list = this.getMockStore("contact_unlocks");
        const record = {
          id: list.length + 1,
          user_id: this.bindings[0],
          unlocked_user_id: this.bindings[1],
          unlocked_at: new Date().toISOString()
        };
        list.push(record);
        this.saveMockStore("contact_unlocks", list);
        return { success: true, results: [record as T] };
      }

      // CMS Settings Replaces
      if (q.includes("cms_settings")) {
        const list = this.getMockStore("cms_settings");
        const key = this.bindings[0];
        const val = this.bindings[1];
        const idx = list.findIndex((s: any) => s.setting_key === key);
        if (idx >= 0) {
          list[idx].setting_value = val;
        } else {
          list.push({ setting_key: key, setting_value: val });
        }
        this.saveMockStore("cms_settings", list);
        return { success: true, results: [] };
      }

      // Messages and Reports
      if (q.includes("messages")) {
        const list = this.getMockStore("messages");
        const record = {
          id: list.length + 1,
          sender_id: this.bindings[0],
          recipient_id: this.bindings[1],
          content: this.bindings[2],
          is_read: 0,
          sent_at: new Date().toISOString()
        };
        list.push(record);
        this.saveMockStore("messages", list);
        return { success: true, results: [record as T] };
      }
      if (q.includes("reports")) {
        const list = this.getMockStore("reports");
        const record = {
          id: list.length + 1,
          reporter_id: this.bindings[0],
          reported_id: this.bindings[1],
          reason: this.bindings[2],
          details: this.bindings[3] || null,
          status: "open",
          severity: this.bindings[4] || "medium",
          admin_notes: null,
          resolved_by: null,
          resolved_at: null,
          created_at: new Date().toISOString()
        };
        list.push(record);
        this.saveMockStore("reports", list);
        return { success: true, results: [record as T] };
      }

      // 9 new tables inserts
      if (q.includes("admin_roles")) {
        const list = this.getMockStore("admin_roles");
        const record = {
          user_id: this.bindings[0],
          role: this.bindings[1],
          assigned_by: this.bindings[2] || "system",
          assigned_at: new Date().toISOString()
        };
        const idx = list.findIndex((u: any) => u.user_id === record.user_id);
        if (idx >= 0) {
          list[idx] = record;
        } else {
          list.push(record);
        }
        this.saveMockStore("admin_roles", list);
        return { success: true, results: [record as T] };
      }
      if (q.includes("user_subscriptions")) {
        const list = this.getMockStore("user_subscriptions");
        const record = {
          id: list.length + 1,
          user_id: this.bindings[0],
          package_id: Number(this.bindings[1]),
          start_date: this.bindings[2] || new Date().toISOString(),
          end_date: this.bindings[3] || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          status: this.bindings[4] || "active",
          payment_id: this.bindings[5] || null,
          created_at: new Date().toISOString()
        };
        list.push(record);
        this.saveMockStore("user_subscriptions", list);
        return { success: true, results: [record as T] };
      }
      if (q.includes("interest_requests")) {
        const list = this.getMockStore("interest_requests");
        const record = {
          id: list.length + 1,
          sender_id: this.bindings[0],
          receiver_id: this.bindings[1],
          status: this.bindings[2] || "pending",
          message: this.bindings[3] || null,
          created_at: new Date().toISOString(),
          responded_at: null
        };
        const idx = list.findIndex((i: any) => i.sender_id === record.sender_id && i.receiver_id === record.receiver_id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...record };
        } else {
          list.push(record);
        }
        this.saveMockStore("interest_requests", list);
        return { success: true, results: [record as T] };
      }
      if (q.includes("favorites")) {
        const list = this.getMockStore("favorites");
        const record = {
          user_id: this.bindings[0],
          favorited_user_id: this.bindings[1],
          created_at: new Date().toISOString()
        };
        const exists = list.find((f: any) => f.user_id === record.user_id && f.favorited_user_id === record.favorited_user_id);
        if (!exists) {
          list.push(record);
          this.saveMockStore("favorites", list);
        }
        return { success: true, results: [record as T] };
      }
      if (q.includes("notifications")) {
        const list = this.getMockStore("notifications");
        const record = {
          id: list.length + 1,
          user_id: this.bindings[0],
          type: this.bindings[1],
          title: this.bindings[2],
          body: this.bindings[3],
          is_read: this.bindings[4] ?? 0,
          reference_id: this.bindings[5] || null,
          created_at: new Date().toISOString()
        };
        list.push(record);
        this.saveMockStore("notifications", list);
        return { success: true, results: [record as T] };
      }
      if (q.includes("mediation_requests")) {
        const list = this.getMockStore("mediation_requests");
        const record = {
          id: list.length + 1,
          requester_id: this.bindings[0],
          target_user_id: this.bindings[1],
          preferred_date: this.bindings[2],
          preferred_time: this.bindings[3],
          notes: this.bindings[4] || null,
          status: this.bindings[5] || "pending",
          admin_notes: this.bindings[6] || null,
          assigned_to: this.bindings[7] || null,
          created_at: new Date().toISOString()
        };
        list.push(record);
        this.saveMockStore("mediation_requests", list);
        return { success: true, results: [record as T] };
      }
      if (q.includes("blocked_users")) {
        const list = this.getMockStore("blocked_users");
        const record = {
          blocker_id: this.bindings[0],
          blocked_id: this.bindings[1],
          reason: this.bindings[2] || null,
          created_at: new Date().toISOString()
        };
        list.push(record);
        this.saveMockStore("blocked_users", list);
        return { success: true, results: [record as T] };
      }
      if (q.includes("admin_audit_log")) {
        const list = this.getMockStore("admin_audit_log");
        const record = {
          id: list.length + 1,
          admin_id: this.bindings[0],
          action_type: this.bindings[1],
          target_type: this.bindings[2],
          target_id: this.bindings[3] || null,
          details: this.bindings[4] || null,
          ip_address: this.bindings[5] || "127.0.0.1",
          created_at: new Date().toISOString()
        };
        list.push(record);
        this.saveMockStore("admin_audit_log", list);
        return { success: true, results: [record as T] };
      }
      if (q.includes("support_tickets")) {
        const list = this.getMockStore("support_tickets");
        const record = {
          id: list.length + 1,
          user_id: this.bindings[0],
          subject: this.bindings[1],
          category: this.bindings[2],
          priority: this.bindings[3] || "medium",
          status: this.bindings[4] || "open",
          messages: this.bindings[5] || "[]",
          assigned_to: this.bindings[6] || null,
          created_at: new Date().toISOString()
        };
        list.push(record);
        this.saveMockStore("support_tickets", list);
        return { success: true, results: [record as T] };
      }
    }

    // 9. DELETE OPERATIONS (e.g. DELETE FROM favorites)
    if (q.includes("delete")) {
      if (q.includes("favorites")) {
        const list = this.getMockStore("favorites");
        const userId = this.bindings[0];
        const favoritedUserId = this.bindings[1];
        const filtered = list.filter((f: any) => !(f.user_id === userId && f.favorited_user_id === favoritedUserId));
        this.saveMockStore("favorites", filtered);
        return { success: true, results: [] };
      }
      if (q.includes("blocked_users")) {
        const list = this.getMockStore("blocked_users");
        const blockerId = this.bindings[0];
        const blockedId = this.bindings[1];
        const filtered = list.filter((b: any) => !(b.blocker_id === blockerId && b.blocked_id === blockedId));
        this.saveMockStore("blocked_users", filtered);
        return { success: true, results: [] };
      }
      if (q.includes("interest_requests")) {
        const list = this.getMockStore("interest_requests");
        if (q.includes("id =")) {
          const id = this.bindings[0];
          const filtered = list.filter((i: any) => i.id !== id);
          this.saveMockStore("interest_requests", filtered);
        } else {
          const senderId = this.bindings[0];
          const receiverId = this.bindings[1];
          const filtered = list.filter((i: any) => !(i.sender_id === senderId && i.receiver_id === receiverId));
          this.saveMockStore("interest_requests", filtered);
        }
        return { success: true, results: [] };
      }
    }

    return { success: true, results: [] };
  }
}

export class MockD1Database implements D1Database {
  prepare(query: string): D1PreparedStatement {
    return new MockPreparedStatement(query);
  }

  async batch(statements: D1PreparedStatement[]): Promise<any[]> {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.run());
    }
    return results;
  }

  async exec(query: string): Promise<any> {
    console.log(`[MOCK DB EXEC] ${query}`);
    return { success: true };
  }
}
