import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch } from "../../api/client.js";
import { Alert, Button, Card, CardDescription, CardTitle } from "../../components/ui/index.js";

export default function AdminClubs() {
  const location = useLocation();
  const [clubs, setClubs] = useState([]);
  const [clubsError, setClubsError] = useState("");
  const [clubsLoading, setClubsLoading] = useState(false);
  const [flashMessage, setFlashMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    setClubsLoading(true);
    setClubsError("");

    (async () => {
      try {
        const list = await apiFetch("/clubs");
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

  return (
    <Card>
      <CardTitle>All clubs</CardTitle>
      <CardDescription>Browse every club and open a dedicated page to create or edit a club.</CardDescription>

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

      <div className="mt-[length:var(--space-10)] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">Name</th>
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-left text-sm font-semibold">Category</th>
              <th className="px-[length:var(--space-3)] py-[length:var(--space-2)] text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clubsLoading ? (
              <tr>
                <td colSpan={3} className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]">
                  Loading clubs...
                </td>
              </tr>
            ) : null}

            {!clubsLoading && clubs.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-[length:var(--space-3)] py-[length:var(--space-4)] text-[var(--color-ink-subtle)]">
                  No clubs found.
                </td>
              </tr>
            ) : null}

            {!clubsLoading
              ? clubs.map((club) => (
                  <tr key={club.id} className="border-b border-[var(--color-line)]">
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">{club.name}</td>
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">{club.category_name || "—"}</td>
                    <td className="px-[length:var(--space-3)] py-[length:var(--space-3)]">
                      <div className="flex justify-end">
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
