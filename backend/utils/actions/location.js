export async function getLocationData(ipAddress) {
  if (!ipAddress) {
    throw new Error("IP address is required");
  }

  try {
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch location for IP: ${ipAddress}`);
    }

    const data = await response.json();

    return {
      ip: data.ip || null,
      city: data.city || null,
      region: data.region || null,
      country: data.country_name || null,
      countryCode: data.country_code || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      timezone: data.timezone || null,
      postalCode: data.postal || null,
    };
  } catch (error) {
    throw new Error(`Unable to get location data: ${error.message}`);
  }
}

// Example usage:
// const location = await getLocationData("8.8.8.8");
// console.log(location);
