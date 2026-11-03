/**
 * HTML email templates for CA Matrimony notifications.
 * Extracted from the email service for reuse and testing.
 */

export type EmailTemplateName =
  | "admin_otp"
  | "kyc_approved"
  | "kyc_rejected"
  | "interest_received"
  | "interest_accepted"
  | "plan_expiring"
  | "payment_confirmed"
  | "refund_processed"
  | "account_suspended"
  | "welcome";

/**
 * Base email template wrapper with CA Matrimony branding.
 */
export function baseTemplate(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #faf5f5; color: #2a0909; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #ecd7d7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
          .header { background: linear-gradient(135deg, #7b1e1e 0%, #521313 100%); color: #ffffff; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px; }
          .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.85; }
          .body { padding: 40px 30px; line-height: 1.6; }
          .body h2 { color: #7b1e1e; font-size: 20px; margin-top: 0; }
          .code-box { background-color: #faf5f5; border: 1px dashed #debab9; border-radius: 12px; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; letter-spacing: 5px; color: #7b1e1e; margin: 25px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: #7b1e1e; color: #ffffff !important; text-decoration: none; border-radius: 9999px; font-weight: bold; margin: 25px 0; text-align: center; }
          .footer { background-color: #fcf6df; border-t: 1px solid #f7eab4; padding: 20px; text-align: center; font-size: 12px; color: #806522; }
          .footer p { margin: 5px 0; }
          .divider { height: 1px; background-color: #ecd7d7; margin: 25px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CA MATRIMONY</h1>
            <p>Exclusive Professional Matches</p>
          </div>
          <div class="body">
            ${content}
          </div>
          <div class="footer">
            <p><strong>CA Matrimony BNCN</strong></p>
            <p>Verified Matrimonial Portal for Chartered Accountants & CS Professionals</p>
            <p>© 2026 CA Matrimony. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Renders an email template with the given variables.
 * Returns { subject, html } for the email service to dispatch.
 */
export function renderTemplate(
  templateName: EmailTemplateName,
  variables: Record<string, string | number>
): { subject: string; html: string } {
  let subject = "";
  let bodyContent = "";

  const name = variables.name || "Member";

  switch (templateName) {
    case "admin_otp":
      subject = "CA Matrimony - Admin Security OTP Login Code";
      bodyContent = baseTemplate(
        "Admin OTP",
        `
        <h2>Admin Security Access Verification</h2>
        <p>Hello ${name},</p>
        <p>A login request was made to access your CA Matrimony Admin Control Panel console. Please use the following single-use verification code to authenticate. This code is valid for 10 minutes.</p>
        <div class="code-box">${variables.code}</div>
        <p>If you did not initiate this request, please contact the security administrator immediately.</p>
        `
      );
      break;

    case "kyc_approved":
      subject = "Congratulations! Your CA Matrimony Profile is Verified";
      bodyContent = baseTemplate(
        "KYC Approved",
        `
        <h2>Congratulations, your profile is verified!</h2>
        <p>Hello ${name},</p>
        <p>We are pleased to inform you that our audit team has successfully reviewed and approved your uploaded academic qualifications and government ID documents.</p>
        <p>A glowing <strong>Green Verified Badge</strong> has been appended to your matrimonial profile card. Other members can now view your profile with full trust, increasing your matchmaking activity!</p>
        <center><a href="https://camatrimonybncn.com/dashboard" class="button">Browse Verified Matches</a></center>
        `
      );
      break;

    case "kyc_rejected":
      subject = "Action Required: Profile Verification Resubmission";
      bodyContent = baseTemplate(
        "KYC Rejected",
        `
        <h2>Academic or Identity Verification Update</h2>
        <p>Hello ${name},</p>
        <p>Thank you for submitting your verification details. During our standard verification review, our moderation team found some discrepancies with your uploaded files:</p>
        <blockquote style="background-color: #faf5f5; border-left: 4px solid #7b1e1e; padding: 15px; margin: 20px 0; font-style: italic;">
          "${variables.reason || "Documents were blurry or illegible. Please ensure documents are clear and high-resolution."}"
        </blockquote>
        <p>To keep the platform safe and ensure all registrations represent legitimate professionals, please login and re-upload clear copies of your documents.</p>
        <center><a href="https://camatrimonybncn.com/onboarding" class="button">Re-upload Documents</a></center>
        `
      );
      break;

    case "interest_received":
      subject = "CA Matrimony - Someone has expressed interest in your profile!";
      bodyContent = baseTemplate(
        "New Match Interest",
        `
        <h2>A matching candidate has sent you an Interest!</h2>
        <p>Hello ${name},</p>
        <p>An exclusive professional candidate (<strong>${variables.senderDegree || "CA"}</strong>) is interested in matching with you!</p>
        <p>Login to your portal dashboard to view their professional profile, background details, and approve or decline the match request.</p>
        <center><a href="https://camatrimonybncn.com/interests" class="button">View Match Interest</a></center>
        `
      );
      break;

    case "interest_accepted":
      subject = "Great News! Your Interest request has been Accepted";
      bodyContent = baseTemplate(
        "Match Interest Accepted",
        `
        <h2>Your Interest request was mutually accepted!</h2>
        <p>Hello ${name},</p>
        <p>Great news! <strong>${variables.receiverName}</strong> has accepted your interest expression request.</p>
        <p>You can now view their shared contact coordinates and chat directly in your messages window. Happy matchmaking!</p>
        <center><a href="https://camatrimonybncn.com/chat" class="button">Open Chat Workspace</a></center>
        `
      );
      break;

    case "plan_expiring":
      subject = "Urgent: Your CA Matrimony Premium Subscription is Expiring";
      bodyContent = baseTemplate(
        "Subscription Expiring",
        `
        <h2>Your subscription plan is expiring soon</h2>
        <p>Hello ${name},</p>
        <p>This is a gentle reminder that your premium subscription plan (<strong>${variables.packageName}</strong>) will expire in <strong>${variables.daysRemaining} days</strong>.</p>
        <p>Renew your subscription today to ensure uninterrupted messaging and direct unlocks of matching professional candidates.</p>
        <center><a href="https://camatrimonybncn.com/plans" class="button">Renew Subscription</a></center>
        `
      );
      break;

    case "payment_confirmed":
      subject = "Invoice Received: CA Matrimony Payment Confirmation";
      bodyContent = baseTemplate(
        "Payment Receipt",
        `
        <h2>Thank you for your premium purchase!</h2>
        <p>Hello ${name},</p>
        <p>We've successfully processed your payment of <strong>₹${variables.amount}</strong> for the <strong>${variables.packageName} Plan</strong>.</p>
        <p>Your subscription is now active until <strong>${variables.expiryDate}</strong>, and your contacts limit has been adjusted to <strong>${variables.contactLimit}</strong>.</p>
        <div class="divider"></div>
        <p><strong>Transaction ID:</strong> ${variables.paymentId}<br>
        <strong>Order Ref:</strong> ${variables.orderId}</p>
        `
      );
      break;

    case "refund_processed":
      subject = "Notification: CA Matrimony Refund Completed";
      bodyContent = baseTemplate(
        "Refund Processed",
        `
        <h2>Your refund has been initiated</h2>
        <p>Hello ${name},</p>
        <p>This is to confirm that a refund of <strong>₹${variables.amount}</strong> has been successfully processed on our system for your transaction ID: <strong>${variables.paymentId}</strong>.</p>
        <p>The funds will be credited back to your original payment source within 5 to 7 bank business days.</p>
        `
      );
      break;

    case "account_suspended":
      subject = "Account Moderation Notice: Profile Suspended";
      bodyContent = baseTemplate(
        "Account Suspended",
        `
        <h2>Matrimonial Profile Suspension</h2>
        <p>Hello ${name},</p>
        <p>This is an official moderation notice that your matrimonial account has been temporarily suspended due to the following reason:</p>
        <blockquote style="background-color: #faf5f5; border-left: 4px solid #7b1e1e; padding: 15px; margin: 20px 0; font-style: italic;">
          "${variables.reason || "Suspicious profile activity or matching guidelines violation."}"
        </blockquote>
        <p>During a suspension, your profile card is invisible to matching candidates, and locks/chats are disabled. If you believe this was an error, please reach out to our help support desk.</p>
        `
      );
      break;

    case "welcome":
      subject = "Welcome to CA Matrimony BNCN!";
      bodyContent = baseTemplate(
        "Welcome to CA Matrimony",
        `
        <h2>Welcome to India's Premier Professional Matrimony Portal!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for choosing <strong>CA Matrimony BNCN</strong> – the most trusted matchmaking platform built exclusively for Chartered Accountants, CS, CMA, and matching elite corporate professionals.</p>
        <p>Our platform guarantees 100% verified profiles, complete privacy shields, and a dedicated moderation desk. We look forward to helping you find your lifetime professional partner!</p>
        <center><a href="https://camatrimonybncn.com/onboarding" class="button">Complete Your Profile</a></center>
        `
      );
      break;
  }

  return { subject, html: bodyContent };
}
