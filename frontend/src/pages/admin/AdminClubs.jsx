import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch } from "../../api/client.js";
import { Alert, Button, Card, CardDescription, CardTitle } from "../../components/ui/index.js";

function qrImageUrl(value) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

export default function AdminClubs() {
  const location = useLocation();
  const [clubs, setClubs] = useState([]);
  const [clubsError, setClubsError] = useState("");
  const [clubsLoading, setClubsLoading] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");
  const [pendingVisibilityId, setPendingVisibilityId] = useState("");
  const [checkInQr, setCheckInQr] = useState(null);
  const [pendingQrId, setPendingQrId] = useState("");

  useEffect(() => {
    let ignore = false;
    setClubsLoading(true);
    setClubsError("");

    (async () => {
      try {
        const list = await apiFetch("/admin/clubs");
        if (!ignore) setClubs(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!ignore) setClubsError(e.message || "Could not load clubs.");
      } finally {
        if (!ignore) setClubsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setFlashMessage(location.state?.flashMessage || "");
  }, [location.state]);

  async function handleVisibilityChange(club) {
    const nextIsActive = !club.is_active;
    const actionLabel = nextIsActive ? "reactivate" : "archive";
    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} "${club.name}"?`,
    );

    if (!confirmed) return;

    setPendingVisibilityId(club.id);
    setClubsError("");
    setFlashMessage("");

    try {
      const updatedClub = await apiFetch(`/admin/clubs/${club.id}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextIsActive }),
      });

      setClubs((currentClubs) =>
        currentClubs.map((currentClub) =>
          currentClub.id === club.id ? updatedClub : currentClub,
        ),
      );
      setFlashMessage(nextIsActive ? "Club reactivated." : "Club archived.");
    } catch (e) {
      setClubsError(e.message || "Could not update club visibility.");
    } finally {
      setPendingVisibilityId("");
    }
  }

  async function handleShowCheckInQr(club) {
    setPendingQrId(club.id);
    setClubsError("");
    setFlashMessage("");
    try {
      const payload = await apiFetch(`/admin/clubs/${club.id}/check-in-token`);
      const checkInUrl = new URL(payload.check_in_path, window.location.origin).toString();
      setCheckInQr({
        title: payload.title,
        activityStartTime: payload.activity_start_time,
        checkInUrl,
        qrUrl: qrImageUrl(checkInUrl),
      });
    } catch (e) {
      setClubsError(e.message || "Could not generate check-in QR code.");
    } finally {
      setPendingQrId("");
    }
  }

  return (
    <Card>
      <CardTitle>All clubs</CardTitle>
      <CardDescription>Browse every club, edit details, and archive outdated clubs so they are hidden from users.</CardDescription>

      <div className="mt-[length:var(--space-7)] flex justify-end">
        <Link to="/admin/clubs/new">
          <Button type="button">Create club</Button>
        </Link>
      </div>

      {clubsError ? (
        <div className="mt-[length:var(--space-7)]">
          <Alert variant="error">{clubsError}</Alert>
        </div>
      ) : null}

      {flashMessage ? (
        <div className="mt-[length:var(--space-7)]">
          <Alert variant="success">{flashMessage}</Alert>
        </div>
      ) : null}

      {checkInQr ? (
        <div className="mt-[length:var(--space-7)] rounded-lg border border-[var(--color-line)] bg-white p-[length:var(--space-5)]">
          <div className="flex flex-wrap items-start gap-[length:var(--space-5)]">
            <img src={checkInQr.qrUrl} alt={`Check-in QR for ${checkInQr.title}`} width="220" height="220" />
            <div className="min-w-0 flex-1">
              <h3 className="m-0 text-lg font-semibold text-[var(--color-ink)]">{checkInQr.title}</h3>
              {checkInQr.activityStartTime ? (
                <p className="mt-[length:var(--space-2)] text-sm text-[var(--color-ink-subtle)]">
                  Activity: {formatDate(checkInQr.activityStartTime)}
                </p>
              ) : null}
              <p className="mt-[length:var(--space-2)] break-all text-sm text-[var(--color-ink-subtle)]">
                {checkInQr.checkInUrl}
              </p>
              <div className="mt-[length:var(--space-4)]">
                <Button type="button" variant="secondary" onClick={() => setCheckInQr(null)}>
                  Hide QR
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-[length:var(--space-10)] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">Name</th>
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">Category</th>
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">Status</th>
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clubsLoading ? (
              <tr>
                <td colSpan={4} className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]">
                  Loading clubs...
                </td>
              </tr>
            ) : null}

            {!clubsLoading && clubs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]">
                  No clubs found.
                </td>
              </tr>
            ) : null}

            {!clubsLoading
              ? clubs.map((club) => (
                  <tr key={club.id} className="border-b border-[var(--color-line)]">
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">{club.name}</td>
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">{club.category_name || "â€”"}</td>
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                      {club.is_active ? "Active" : "Archived"}
                    </td>
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                      <div className="flex justify-end gap-[length:var(--space-3)]">
                        <Button
                          type="button"
                          variant={club.is_active ? "secondary" : "default"}
                          disabled={pendingVisibilityId === club.id}
                          onClick={() => handleVisibilityChange(club)}
                        >
                          {pendingVisibilityId === club.id
                            ? "Saving..."
                            : club.is_active
                              ? "Archive"
                              : "Reactivate"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={pendingQrId === club.id}
                          onClick={() => handleShowCheckInQr(club)}
                        >
                          {pendingQrId === club.id ? "Loading..." : "Check-in QR"}
                        </Button>
                        <Link to={`/admin/clubs/${club.id}/edit`}>
                          <Button type="button" variant="secondary">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
