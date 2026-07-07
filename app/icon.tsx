import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#ff6a5a",
          borderRadius: 110,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 300,
            fontWeight: 800,
            fontFamily: "serif",
            lineHeight: 1,
            marginTop: 20,
          }}
        >
          R
        </span>
      </div>
    ),
    { ...size }
  );
}
