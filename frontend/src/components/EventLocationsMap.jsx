import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { EmptyState } from "./ui/index.js";
import { getEventMapPoint } from "../lib/eventLocationMap.js";

function formatEventDate(value) {
  if (!value) return "Date to be announced";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date to be announced";
  return parsed.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupEventsByPoint(events) {
  const grouped = new Map();

  for (const event of events || []) {
    const point = getEventMapPoint(event);
    if (!point) continue;

    const key = `${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}:${point.label}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.events.push(event);
      continue;
    }

    grouped.set(key, {
      id: key,
      point,
      events: [event],
    });
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const aTime = new Date(a.events[0]?.start_time || 0).getTime();
    const bTime = new Date(b.events[0]?.start_time || 0).getTime();
    return aTime - bTime;
  });
}

function createMarkerIcon(count, selected) {
  const size = count > 1 ? 46 : 38;
  const color = selected ? "#dc2626" : "#2563eb";
  const shadow = selected
    ? "0 14px 28px rgba(220, 38, 38, 0.35)"
    : "0 14px 28px rgba(37, 99, 235, 0.28)";

  return divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        transform: translate(-50%, -100%);
      ">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 999px 999px 999px 0;
          transform: rotate(-45deg);
          background: ${color};
          border: 3px solid rgba(255,255,255,0.96);
          box-shadow: ${shadow};
        "></div>
        <div style="
          position: absolute;
          inset: 11px;
          border-radius: 999px;
          background: white;
          transform: rotate(0deg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${color};
          font-size: ${count > 1 ? "13px" : "11px"};
          font-weight: 800;
          font-family: inherit;
        ">${count > 1 ? count : ""}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 8],
  });
}

function FitMapToMarkers({ groups }) {
  const map = useMap();

  useEffect(() => {
    if (groups.length === 0) {
      map.setView([54.9, 24.0], 7);
      return;
    }

    if (groups.length === 1) {
      map.setView([groups[0].point.latitude, groups[0].point.longitude], 14);
      return;
    }

    map.fitBounds(
      groups.map((group) => [group.point.latitude, group.point.longitude]),
      { padding: [40, 40] }
    );
    map.invalidateSize();
  }, [groups, map]);

  return null;
}

export default function EventLocationsMap({ events }) {
  const groups = useMemo(() => groupEventsByPoint(events), [events]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) || groups[0] || null;

  return (
    <section style={shell}>
      <div style={headerRow}>
        <div>
          <p style={eyebrow}>Map view</p>
          <h2 style={title}>Where events are happening</h2>
        </div>
        <span style={countBadge}>
          {groups.length} pin{groups.length === 1 ? "" : "s"}
        </span>
      </div>

      {groups.length === 0 ? (
        <div style={emptyWrap}>
          <EmptyState
            align="left"
            title="No mappable event locations"
            description="Only events with valid in-person location data appear here. Try another filter or switch back to the event cards."
          />
        </div>
      ) : (
        <div style={layout}>
          <div style={mapCard}>
            <MapContainer
              center={[54.9, 24.0]}
              zoom={7}
              scrollWheelZoom={true}
              style={mapStyle}
            >
              <FitMapToMarkers groups={groups} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {groups.map((group) => {
                const isSelected = group.id === selectedGroup?.id;
                return (
                  <Marker
                    key={group.id}
                    position={[group.point.latitude, group.point.longitude]}
                    icon={createMarkerIcon(group.events.length, isSelected)}
                    eventHandlers={{
                      click: () => setSelectedGroupId(group.id),
                    }}
                  >
                    <Popup minWidth={250}>
                      <div style={popupWrap}>
                        <p style={popupLocation}>{group.point.label}</p>
                        <p style={popupSubline}>
                          {group.point.location || group.point.city}
                        </p>
                        {group.events.map((event) => (
                          <div key={event.id} style={popupEvent}>
                            <p style={popupDate}>{formatEventDate(event.start_time)}</p>
                            <p style={popupTitle}>{event.title}</p>
                            <Link to={`/events/${event.id}`} style={popupLink}>
                              Open event
                            </Link>
                          </div>
                        ))}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <aside style={detailsPanel}>
            {selectedGroup ? (
              <>
                <div style={detailsHeader}>
                  <div>
                    <p style={detailsEyebrow}>Selected location</p>
                    <h3 style={detailsTitle}>{selectedGroup.point.label}</h3>
                  </div>
                  <span style={detailsBadge}>{selectedGroup.events.length} event{selectedGroup.events.length === 1 ? "" : "s"}</span>
                </div>

                <p style={detailsLocation}>
                  {selectedGroup.point.location || selectedGroup.point.city}
                </p>

                <div style={eventList}>
                  {selectedGroup.events.map((event) => (
                    <article key={event.id} style={eventCard}>
                      <p style={eventDate}>{formatEventDate(event.start_time)}</p>
                      <h4 style={eventTitle}>{event.title}</h4>
                      {event.club_name ? (
                        <p style={eventHost}>Hosted by {event.club_name}</p>
                      ) : null}
                      <p style={eventMeta}>
                        {event.location
                          ? `${event.location}${event.city ? `, ${event.city}` : ""}`
                          : event.city || "Location to be announced"}
                      </p>
                      <Link to={`/events/${event.id}`} style={eventLink}>
                        View details →
                      </Link>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  );
}

const shell = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "20px",
  borderRadius: "30px",
  background: "rgba(255, 255, 255, 0.96)",
  boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const eyebrow = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#0f766e",
};

const title = {
  margin: "4px 0 0 0",
  fontSize: "24px",
  lineHeight: 1.1,
  color: "#0f172a",
};

const countBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "#0f172a",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 800,
};

const emptyWrap = {
  paddingTop: "8px",
};

const layout = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

const mapCard = {
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  minHeight: "440px",
};

const mapStyle = {
  width: "100%",
  height: "100%",
  minHeight: "440px",
};

const detailsPanel = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "18px",
  borderRadius: "24px",
  background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
};

const detailsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
};

const detailsEyebrow = {
  margin: 0,
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#64748b",
};

const detailsTitle = {
  margin: "6px 0 0 0",
  fontSize: "22px",
  color: "#0f172a",
  lineHeight: 1.15,
};

const detailsBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 12px",
  borderRadius: "999px",
  background: "rgba(37, 99, 235, 0.1)",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: 800,
};

const detailsLocation = {
  margin: 0,
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.5,
};

const eventList = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const eventCard = {
  padding: "14px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
};

const eventDate = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 800,
  color: "#0f766e",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const eventTitle = {
  margin: "8px 0 0 0",
  color: "#0f172a",
  fontSize: "17px",
  lineHeight: 1.25,
};

const eventHost = {
  margin: "6px 0 0 0",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 700,
};

const eventMeta = {
  margin: "8px 0 0 0",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.5,
};

const eventLink = {
  display: "inline-flex",
  alignItems: "center",
  marginTop: "10px",
  color: "#1d4ed8",
  fontSize: "13px",
  fontWeight: 800,
  textDecoration: "none",
};

const popupWrap = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  minWidth: "220px",
};

const popupLocation = {
  margin: 0,
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: 800,
};

const popupSubline = {
  margin: 0,
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.4,
};

const popupEvent = {
  paddingTop: "8px",
  borderTop: "1px solid rgba(148, 163, 184, 0.2)",
};

const popupDate = {
  margin: 0,
  color: "#0f766e",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const popupTitle = {
  margin: "6px 0 0 0",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: 1.35,
};

const popupLink = {
  display: "inline-flex",
  marginTop: "6px",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: 800,
  textDecoration: "none",
};
