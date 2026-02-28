import * as Calendar from "expo-calendar";
import * as Contacts from "expo-contacts";
import * as Linking from "expo-linking";

export async function searchContacts(name: string) {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status === "granted") {
    const { data } = await Contacts.getContactsAsync({
      name: name,
      fields: [Contacts.Fields.PhoneNumbers],
    });

    if (data.length > 0) {
      // Filter for contacts with at least one phone number
      const withPhone = data.filter(
        (c) => c.phoneNumbers && c.phoneNumbers.length > 0,
      );
      if (withPhone.length > 0) {
        return withPhone.map((c) => ({
          name: c.name,
          phoneNumber: c.phoneNumbers![0].number,
        }));
      }
    }
    return [];
  } else {
    throw new Error("Contacts permission not granted");
  }
}

export async function callSomeone(phoneNumber: string) {
  const url = `tel:${phoneNumber}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
    return `Calling ${phoneNumber}`;
  } else {
    throw new Error("Phone calls are not supported on this device");
  }
}

export async function setReminder(title: string, dateIso: string) {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status === "granted") {
    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT,
    );

    // Find a calendar that is writable and likely to be visible
    let targetCalendar = calendars.find(
      (cal) => cal.isPrimary && cal.allowsModifications,
    );
    if (!targetCalendar) {
      targetCalendar = calendars.find((cal) => cal.allowsModifications);
    }

    if (!targetCalendar) {
      throw new Error("No writable calendar found on this device");
    }
    targetCalendar = calendars[0];
    const startDate = new Date(dateIso);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    const eventttt = await Calendar.createEventAsync(targetCalendar.id, {
      title,
      startDate,
      endDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    console.log("setReminder");
    console.log(targetCalendar.id, title, startDate, endDate);

    return `Reminder for "${title}" set in your ${targetCalendar.title} calendar for ${startDate.toLocaleString()}`;
  } else {
    throw new Error("Calendar permission not granted");
  }
}
