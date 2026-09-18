function get_current_time() {
  // This function returns the current time in a human-readable format
  return new Date().toISOString();
}

function get_time_in_timezone(timezone) {
  // This function returns the current time in the specified timezone
  // You can use libraries like moment-timezone or date-fns-tz to handle timezone conversions
  return new Date().toLocaleTimeString("en-US", { timeZone: timezone });
}

function get_date_in_timezone(timezone) {
  // This function returns the current date in the specified timezone
  // Similar to get_time_in_timezone, you can use libraries for timezone handling
  return new Date().toLocaleDateString("en-US", { timeZone: timezone });
}
