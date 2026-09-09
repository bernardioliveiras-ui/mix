"use client";

import { useEffect } from "react";

export function TrafficAttribution() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const attribution = {
      utmSource: params.get("utm_source") ?? "",
      utmMedium: params.get("utm_medium") ?? "",
      utmCampaign: params.get("utm_campaign") ?? "",
      utmContent: params.get("utm_content") ?? "",
      landingPage: `${window.location.pathname}${window.location.search}`.slice(0, 500),
    };
    if (Object.values(attribution).slice(0, 4).some(Boolean)) {
      localStorage.setItem("mix10_attribution", JSON.stringify(attribution));
    }
  }, []);

  return null;
}
