# UI/UX Design System (Trending & Professional Matrimony)

## 1. Design Philosophy & Vibe
The visual identity of this platform must balance **traditional matrimonial trust** with **modern professional elegance**. Since the primary target audience is Chartered Accountants (CAs) and other highly educated professionals, the UI should feel premium, uncluttered, and highly trustworthy—steering away from overly loud colors typical of older matrimony sites.

* **Keywords:** Professional, Clean, Trustworthy, Modern, Glassmorphic.
* **Design Trend Focus:** Clean minimal interfaces (similar to modern fintech/premium lifestyle apps), subtle glassmorphism for profile cards, ample whitespace, and highly legible typography.

---

## 2. Color Palette

### Primary Colors (Trust & Professionalism)
* **Primary Brand:** `#1E3A8A` (Deep Indigo Blue) - Used for primary buttons, active tabs, and main branding. Conveys security and professionalism.
* **Primary Accent:** `#D97706` (Warm Amber/Gold) - Used for premium badges (Gold/Platinum plans), verified ticks, and primary call-to-actions (e.g., "Upgrade Plan"). Gives a subtle nod to traditional Indian auspicious colors without being overwhelming.

### Neutral Colors (Backgrounds & Typography)
* **Background (Light Mode):** `#F8FAFC` (Slate 50) - A very soft, cool off-white to reduce eye strain.
* **Card Backgrounds:** `#FFFFFF` (Pure White) - To make profile cards pop against the background.
* **Text (Primary):** `#0F172A` (Slate 900) - For headings and important data.
* **Text (Secondary):** `#64748B` (Slate 500) - For descriptions, labels, and minor details.

### Semantic/Status Colors
* **Success (Verified/Active):** `#10B981` (Emerald Green)
* **Warning/Pending:** `#F59E0B` (Amber)
* **Error/Reject:** `#EF4444` (Red)

---

## 3. Typography
Use modern, geometric sans-serif fonts optimized for both web and mobile readability.
* **Primary Font:** `Plus Jakarta Sans` or `Inter` (Available via Google Fonts).
    * *Headings:* Semi-Bold (600) to Bold (700) for profile names and page titles.
    * *Body text:* Regular (400) or Medium (500) for standard readability.
* **Type Scale:**
    * H1: 32px / 40px line-height (Main Page Titles)
    * H2: 24px / 32px line-height (Section Headers)
    * H3 (Profile Names): 20px / 28px line-height
    * Body: 16px / 24px line-height
    * Small (Labels/Badges): 12px or 14px

---

## 4. UI Components

### Buttons
* **Primary Button:** Deep Indigo background, White text, fully rounded (pill-shaped) `border-radius: 9999px` to feel approachable. Subtle drop shadow on hover.
* **Secondary Button:** Transparent background with a 1px Deep Indigo border and Indigo text.
* **Disabled Button:** Slate 200 background, Slate 400 text, cursor not-allowed.

### Profile Cards (The Core Component)
* **Design:** Pure white background, `border-radius: 16px`, soft shadow (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)`).
* **Image Handling:**
    * *Unlocked/Approved:* Crisp, clear image taking up the top 60% of the card.
    * *Locked/Unapproved:* Heavy gaussian blur (`backdrop-filter: blur(10px)`) with a lock icon overlay and an "Unlock to View" CTA.
* **Badges:** Overlay a floating "Verified" shield icon (Emerald Green) over the top right corner of the profile photo. Show "CA" or profession prominently as a pill badge under the name.

### Forms & Inputs
* **Style:** Modern floating labels or cleanly aligned labels above inputs.
* **Input Fields:** `border-radius: 8px`, `border: 1px solid #E2E8F0`. Focus state should highlight with a 2px Primary Indigo ring.
* **Multi-step Wizard:** The registration form must use a clean horizontal progress bar at the top (e.g., Step 2 of 5: Career Details) so users know how much is left.

### Navigation & Layout
* **Desktop:** Sticky top navbar with the dynamic **Project Logo** (uploaded via Admin Panel) on the left, primary navigation links centered, and user profile avatar/notifications on the right.
* **Mobile-First Approach:** Given the audience, 80%+ traffic will be mobile. Use a sticky bottom navigation bar (Home, Search, Chat, Profile) for easy thumb reachability.

---

## 5. Micro-Interactions & States
* **Skeleton Loaders:** Instead of generic spinning wheels, use skeleton screens that mimic the layout of profile cards while data is fetching from the API.
* **Empty States:** Beautiful, illustrated empty states for "No matches found," "No new messages," or "No unlocked contacts yet," paired with a clear CTA (e.g., "Adjust Search Filters").
* **Toast Notifications:** Non-intrusive slide-in notifications (top-right on desktop, top-center on mobile) for actions like "Profile Shortlisted" or "Contact Unlocked Successfully."
