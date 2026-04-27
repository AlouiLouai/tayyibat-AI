import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          color: "#FFFFFF",
          border: "20px solid #FF5722",
          fontSize: 180,
          fontWeight: 900,
        }}
      >
        ط
      </div>
    ),
    size
  );
}
