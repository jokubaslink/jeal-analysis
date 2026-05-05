const KNOWN_EVENT_LOCATIONS = [
  {
    city: "Vilnius",
    latitude: 54.72217,
    longitude: 25.33712,
    aliases: [
      "cathedral square meeting point",
      "gedimino ave. 7, vilnius",
    ],
    label: "Cathedral Square",
  },
  {
    city: "Vilnius",
    latitude: 54.72455,
    longitude: 25.33684,
    aliases: ["vilnius university observatory courtyard"],
    label: "VU Observatory Courtyard",
  },
  {
    city: "Vilnius",
    latitude: 54.7229,
    longitude: 25.3378,
    aliases: ["media lab"],
    label: "Media Lab",
  },
  {
    city: "Vilnius",
    latitude: 54.71655,
    longitude: 25.27356,
    aliases: ["vingis park entrance"],
    label: "Vingis Park",
  },
  {
    city: "Vilnius",
    latitude: 54.72265,
    longitude: 25.32154,
    aliases: ["student union dance studio", "student union hall"],
    label: "Student Union",
  },
  {
    city: "Vilnius",
    latitude: 54.7221,
    longitude: 25.3202,
    aliases: ["main campus courtyard", "main campus atrium", "campus cafe stage"],
    label: "Main Campus",
  },
  {
    city: "Vilnius",
    latitude: 54.72295,
    longitude: 25.3186,
    aliases: ["student center", "student center room b12", "career center"],
    label: "Student Center",
  },
  {
    city: "Vilnius",
    latitude: 54.7238,
    longitude: 25.31985,
    aliases: ["innovation lab", "innovation lab room 204", "computer lab 2.08"],
    label: "Innovation Lab",
  },
  {
    city: "Vilnius",
    latitude: 54.7244,
    longitude: 25.31885,
    aliases: ["business incubator hall"],
    label: "Business Incubator Hall",
  },
  {
    city: "Vilnius",
    latitude: 54.72125,
    longitude: 25.3153,
    aliases: ["campus garden", "outdoor basketball courts"],
    label: "Campus Garden",
  },
  {
    city: "Vilnius",
    latitude: 54.7206,
    longitude: 25.3142,
    aliases: ["university stadium", "university stadium gate"],
    label: "University Stadium",
  },
  {
    city: "Vilnius",
    latitude: 54.72315,
    longitude: 25.33478,
    aliases: ["library commons"],
    label: "Library Commons",
  },
  {
    city: "Vilnius",
    latitude: 54.72234,
    longitude: 25.33755,
    aliases: ["campus clean-up picnic"],
    label: "City Center Meetup",
  },
  {
    city: "Vilnius",
    latitude: 54.72373,
    longitude: 25.33695,
    aliases: ["sauletekio av. 11, vilnius"],
    label: "Sauletekio 11",
  },
  {
    city: "Vilnius",
    latitude: 54.72373,
    longitude: 25.33695,
    aliases: [
      "vilnius tech",
      "vilnius tech, sauletekio ave. 11",
      "vilnius tech, sauletekio av. 11",
      "vilnius tech sustainability hub, s4 building, sauletekio al. 11",
      "vilnius tech central building, aula magna",
    ],
    label: "VILNIUS TECH",
  },
  {
    city: "Kaunas",
    latitude: 54.89852,
    longitude: 23.9036,
    aliases: ["kaunas valstybine filharmonija"],
    label: "Kaunas State Philharmonic",
  },
  {
    city: "Kaunas",
    latitude: 54.8974,
    longitude: 23.9152,
    aliases: [
      "kaunas university of technology",
      "ktu, studentu str. 50, room 106",
      "ktu faculty of mechanical engineering and design, studentu str. 56",
      "ktu faculty of mechanical engineering and design, studentu st. 56",
      "ktu m-lab, studentu st. 63a",
      "studentu g. 56, kaunas",
    ],
    label: "KTU Campus",
  },
  {
    city: "Kaunas",
    latitude: 54.89696,
    longitude: 23.88555,
    aliases: ["vdu botanikos sodas"],
    label: "VDU Botanical Garden",
  },
  {
    city: "Kaunas",
    latitude: 54.8952,
    longitude: 23.91228,
    aliases: [
      "vytautas magnus university",
      "mickeviciaus g. 9, kaunas",
      "arts hub studio 3",
    ],
    label: "Vytautas Magnus University",
  },
  {
    city: "Kaunas",
    latitude: 54.89822,
    longitude: 23.90677,
    aliases: ["m. k. ciurlionis national museum of art"],
    label: "Ciurlionis Museum",
  },
  {
    city: "Kaunas",
    latitude: 54.89796,
    longitude: 23.90492,
    aliases: ["kauno menininku namai", "lds kauno skyrius / galerija drobe"],
    label: "Kaunas Artists' House",
  },
  {
    city: "Kaunas",
    latitude: 54.89722,
    longitude: 23.91466,
    aliases: ["kauno miesto muziejus, l. zamenhofo g. 4"],
    label: "Kaunas City Museum",
  },
  {
    city: "Kaunas",
    latitude: 54.88767,
    longitude: 23.93565,
    aliases: ["nemunas island lawn"],
    label: "Nemunas Island",
  },
  {
    city: "Kaunas",
    latitude: 54.9065,
    longitude: 23.9268,
    aliases: ["lithuanian university of health sciences", "lsmu veterinarijos akademija"],
    label: "LSMU",
  },
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”„"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isOnlineLocation(value) {
  const normalized = normalizeText(value);
  return (
    !normalized ||
    normalized.includes("zoom") ||
    normalized.includes("teams") ||
    normalized.includes("webinar") ||
    normalized === "online"
  );
}

function getKnownLocationMatch(location, city) {
  const normalizedLocation = normalizeText(location);
  const normalizedCity = normalizeText(city);

  return (
    KNOWN_EVENT_LOCATIONS.find((candidate) => {
      const sameCity =
        !candidate.city || normalizeText(candidate.city) === normalizedCity;
      return (
        sameCity &&
        candidate.aliases.some(
          (alias) =>
            normalizedLocation === alias || normalizedLocation.includes(alias)
        )
      );
    }) || null
  );
}

export function getEventMapPoint(event) {
  if (!event || event.is_online) return null;

  const location = event.location || "";
  if (isOnlineLocation(location)) return null;

  const directMatch = getKnownLocationMatch(location, event.city);
  if (directMatch) {
    return {
      latitude: directMatch.latitude,
      longitude: directMatch.longitude,
      city: event.city || directMatch.city,
      location: event.location,
      label: directMatch.label,
    };
  }

  return null;
}
