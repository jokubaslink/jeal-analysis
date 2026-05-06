const KNOWN_EVENT_LOCATIONS = [
  {
    city: "Vilnius",
    latitude: 54.6859,
    longitude: 25.2877,
    aliases: [
      "cathedral square meeting point",
      "cathedral square",
    ],
    label: "Cathedral Square",
  },
  {
    city: "Vilnius",
    latitude: 54.6871,
    longitude: 25.2791,
    aliases: [
      "gedimino ave. 7, vilnius",
      "gedimino pr. 7, vilnius",
      "ism university, gedimino pr. 7, vilnius",
    ],
    label: "ISM University",
  },
  {
    city: "Vilnius",
    latitude: 54.6828,
    longitude: 25.2877,
    aliases: [
      "vilnius university observatory courtyard",
      "vilnius university, universiteto g. 3, vilnius",
      "universiteto g. 3, vilnius",
      "vu central campus seminar room",
      "vu faculty study space",
      "vilnius university",
    ],
    label: "Vilnius University",
  },
  {
    city: "Vilnius",
    latitude: 54.6832,
    longitude: 25.2688,
    aliases: [
      "vilnius university cultural center",
      "vilnius university cultural center, m. k. ciurlionio g. 21, vilnius",
      "m. k. ciurlionio g. 21, vilnius",
    ],
    label: "VU Cultural Center",
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
    aliases: [
      "sauletekio av. 11, vilnius",
      "sauletekio al. 11, vilnius",
    ],
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
      "vilnius tech, sauletekio al. 11, vilnius",
      "vilnius tech sustainability hub, s4 building, sauletekio al. 11",
      "vilnius tech central building, aula magna",
    ],
    label: "VILNIUS TECH",
  },
  {
    city: "Vilnius",
    latitude: 54.7243,
    longitude: 25.3346,
    aliases: [
      "vilnius tech sports and arts centre",
      "vilnius tech sports and arts centre, sauletekio al. 28, vilnius",
      "sauletekio al. 28, vilnius",
    ],
    label: "VILNIUS TECH Sports and Arts Centre",
  },
  {
    city: "Vilnius",
    latitude: 54.724,
    longitude: 25.3317,
    aliases: [
      "vilnius tech library",
      "vilnius tech library, sauletekio al. 14, vilnius",
      "sauletekio al. 14, vilnius",
    ],
    label: "VILNIUS TECH Library",
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
    latitude: 54.9043,
    longitude: 23.9585,
    aliases: [
      "kaunas university of technology",
      "kaunas university of technology, k. donelaicio g. 73, kaunas",
      "k. donelaicio g. 73, kaunas",
      "ktu, studentu str. 50, room 106",
      "ktu faculty of informatics, studentu g. 50, kaunas",
      "studentu g. 50, kaunas",
      "ktu faculty of mechanical engineering and design, studentu str. 56",
      "ktu faculty of mechanical engineering and design, studentu st. 56",
      "ktu faculty of mechanical engineering and design, studentu g. 56, kaunas",
      "ktu m-lab, studentu st. 63a",
      "ktu m-lab, studentu g. 63a, kaunas",
      "studentu g. 56, kaunas",
    ],
    label: "KTU Campus",
  },
  {
    city: "Kaunas",
    latitude: 54.9049,
    longitude: 23.9559,
    aliases: [
      "ktu sports and wellness centre",
      "ktu sports and wellness centre, studentu g. 48, kaunas",
      "studentu st. 48, kaunas",
      "studentu g. 48, kaunas",
    ],
    label: "KTU Sports and Wellness Centre",
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
      "vytautas magnus university, k. donelaicio g. 58, kaunas",
      "k. donelaicio g. 58, kaunas",
      "mickeviciaus g. 9, kaunas",
      "arts hub studio 3",
      "vmu student lounge",
      "vmu campus courtyard",
      "vmu social sciences classroom",
      "vmu conference hall",
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
    aliases: [
      "kauno menininku namai",
      "lds kauno skyrius / galerija drobe",
      "kauno paveikslu galerija",
      "kavine kultura",
      "kavine kultura (kauno paveikslu galerijos kiemelis)",
    ],
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
    aliases: [
      "lithuanian university of health sciences",
      "lithuanian university of health sciences, a. mickeviciaus g. 9, kaunas",
      "a. mickeviciaus g. 9, kaunas",
      "lsmu veterinarijos akademija",
    ],
    label: "LSMU",
  },
  {
    city: "Kaunas",
    latitude: 54.8844,
    longitude: 23.9347,
    aliases: ["girstucio rumai"],
    label: "Girstutis",
  },
  {
    city: "Kaunas",
    latitude: 54.8995,
    longitude: 23.9183,
    aliases: [
      "kauno sv. arkangelo mykolo (igulos) baznycia (soboras)",
      "soboras",
    ],
    label: "St. Michael the Archangel Church",
  },
  {
    city: "Kaunas",
    latitude: 54.8944,
    longitude: 23.9216,
    aliases: ["kkc / kauno kulturos centras", "kauno kulturos centras"],
    label: "Kaunas Cultural Centre",
  },
  {
    city: "Kaunas",
    latitude: 54.908,
    longitude: 23.914,
    aliases: [
      "hogas pub",
      "impro kaunas teatro sale",
      "4 metu laikai",
      "el tango club espacio cultural",
      "jonavos g. 7, teslos sale",
      "kauno sporto mokykla bangputys",
    ],
    label: "Kaunas Venue",
  },
  {
    city: "Klaipeda",
    latitude: 55.7261,
    longitude: 21.1249,
    aliases: [
      "klaipeda university",
      "klaipeda university, herkaus manto g. 84, klaipeda",
      "klaipeda university sports centre",
      "klaipeda university sports centre, herkaus manto g. 84, klaipeda",
      "herkaus manto g. 84, klaipeda",
      "klaipeda university courtyard",
      "klaipeda university sports hall",
      "klaipeda university music room",
      "klaipeda university black box room",
    ],
    label: "Klaipeda University",
  },
];

const CITY_FALLBACK_LOCATIONS = {
  vilnius: {
    city: "Vilnius",
    latitude: 54.6872,
    longitude: 25.2797,
    label: "Vilnius",
  },
  kaunas: {
    city: "Kaunas",
    latitude: 54.8985,
    longitude: 23.9036,
    label: "Kaunas",
  },
  klaipeda: {
    city: "Klaipeda",
    latitude: 55.7033,
    longitude: 21.1443,
    label: "Klaipeda",
  },
};

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

  const cityFallback = CITY_FALLBACK_LOCATIONS[normalizeText(event.city)];
  if (!cityFallback) return null;

  return {
    latitude: cityFallback.latitude,
    longitude: cityFallback.longitude,
    city: event.city || cityFallback.city,
    location: event.location,
    label: event.location || cityFallback.label,
  };
}
