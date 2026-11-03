import { ImageResponse } from "next/og";

export const alt = "CA Matrimony BNCN — A shared ambition. A life together.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "68px 80px", background: "#fbf8f2", color: "#743642", borderBottom: "14px solid #743642" }}>
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 3 }}>CA MATRIMONY BNCN</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.12, letterSpacing: -3 }}>
        <div style={{ display: "flex" }}>A shared ambition.</div>
        <div style={{ display: "flex" }}>A life together.</div>
      </div>
      <div style={{ display: "flex", fontSize: 25, color: "#645b57" }}>Matrimony for CAs, CSs, CMAs &amp; professionals</div>
    </div>,
    size,
  );
}
