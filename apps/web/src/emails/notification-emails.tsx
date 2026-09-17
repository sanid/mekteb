import * as React from "react";

function wrapper(title: string, children: React.ReactNode) {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        background: "#f9fafb",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}
    >
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{
          maxWidth: 560,
          margin: "40px auto",
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        <tr>
          <td style={{ padding: "32px 40px" }}>
            <h1
              style={{
                margin: "0 0 16px",
                fontSize: 20,
                color: "#111827",
              }}
            >
              {title}
            </h1>
            {children}
          </td>
        </tr>
        <tr>
          <td
            style={{
              padding: "16px 40px",
              background: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#9ca3af",
                textAlign: "center",
              }}
            >
              Mekteb — Mosque education and community platform
            </p>
          </td>
        </tr>
      </table>
    </div>
  );
}

function cta(url: string, label: string) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0}>
      <tr>
        <td align="center">
          <a
            href={url}
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#1d4ed8",
              color: "#fff",
              textDecoration: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {label}
          </a>
        </td>
      </tr>
    </table>
  );
}

export function NewMessageEmail({
  senderName,
  subject,
  preview,
  url,
}: {
  senderName: string;
  subject: string;
  preview: string;
  url: string;
}) {
  return wrapper(
    `New message from ${senderName}`,
    <>
      {subject ? (
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 15,
            fontWeight: 600,
            color: "#374151",
          }}
        >
          {subject}
        </p>
      ) : null}
      <p
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          color: "#4b5563",
          lineHeight: 1.6,
        }}
      >
        {preview}
      </p>
      {cta(url, "View message")}
    </>,
  );
}

export function AnnouncementEmail({
  title,
  preview,
  url,
}: {
  title: string;
  preview: string;
  url: string;
}) {
  return wrapper(
    title,
    <>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          color: "#4b5563",
          lineHeight: 1.6,
        }}
      >
        {preview}
      </p>
      {cta(url, "Read announcement")}
    </>,
  );
}

export function HomeworkEmail({
  studentName,
  title,
  dueDate,
  url,
}: {
  studentName: string;
  title: string;
  dueDate: string | null;
  url: string;
}) {
  return wrapper(
    `New homework for ${studentName}`,
    <>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 15,
          fontWeight: 600,
          color: "#374151",
        }}
      >
        {title}
      </p>
      {dueDate ? (
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 14,
            color: "#6b7280",
          }}
        >
          Due: {dueDate}
        </p>
      ) : null}
      {cta(url, "View homework")}
    </>,
  );
}

export function AbsentEmail({
  studentName,
  sessionDate,
  url,
}: {
  studentName: string;
  sessionDate: string;
  url: string;
}) {
  return wrapper(
    `${studentName} was marked absent`,
    <>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          color: "#4b5563",
          lineHeight: 1.6,
        }}
      >
        Your child <strong>{studentName}</strong> was marked absent on{" "}
        <strong>{sessionDate}</strong>.
      </p>
      {cta(url, "View attendance")}
    </>,
  );
}
