import * as React from "react";

export function GdprExportEmail(props: { mosqueName: string }) {
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
              Ihr Datenexport
            </h1>
            <p style={{ color: "#374151", lineHeight: 1.6, fontSize: 14 }}>
              Sie haben eine Kopie Ihrer persönlichen Daten von{" "}
              <strong>{props.mosqueName}</strong> auf Mekteb angefordert.
            </p>
            <p style={{ color: "#374151", lineHeight: 1.6, fontSize: 14 }}>
              Ihre vollständigen Daten sind dieser E-Mail als{" "}
              <code>mekteb-export.html</code> beigefügt. Öffnen Sie die Datei
              in einem beliebigen Browser, um Ihre Daten als formatiertes,
              lesbares Dokument anzuzeigen. Bitte behandeln Sie diese Datei
              vertraulich — sie enthält persönliche Informationen über Sie
              und, falls Sie Elternteil sind, über Ihre Kinder.
            </p>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 24 }}>
              Falls Sie diesen Export nicht angefordert haben, kontaktieren
              Sie bitte umgehend Ihren Moschee-Administrator und ändern Sie
              Ihr Passwort.
            </p>
          </td>
        </tr>
        <tr>
          <td
            style={{
              padding: "16px 40px",
              background: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
              color: "#6b7280",
              fontSize: 12,
            }}
          >
            Dieser Export wurde gemäß Art. 15 DSGVO erstellt.
          </td>
        </tr>
      </table>
    </div>
  );
}
