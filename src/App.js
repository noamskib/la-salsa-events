import "./App.css";
import React, { useState, useEffect } from "react";
import axios from "axios";

const dayMapping = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

//App Component
function App() {
  const [oneOffEvents, setOneOffEvents] = useState([]);
  const [weeklyEvents, setWeeklyEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const oneOffEventsResponse = await axios.get("/one-off-events.json");
        const weeklyEventsResponse = await axios.get(
          "/recurring-weekly-events.json"
        );
        const monthlyEventsResponse = await axios.get(
          "/recurring-monthly-events.json"
        );

        // Process one-off events
        const processedOneOffEvents = oneOffEventsResponse.data.map((event) => {
          const date = new Date(event.date);
          if (isNaN(date)) {
            throw new Error(`Invalid date: ${event.date}`);
          }
          return {
            ...event,
            date,
          };
        });
        setOneOffEvents(processedOneOffEvents);

        // Process weekly events
        const processedWeeklyEvents = weeklyEventsResponse.data.map((event) => {
          const day = event.day;
          if (!day) {
            throw new Error(`Invalid day: ${event.day}`);
          }
          return {
            ...event,
            day,
          };
        });
        setWeeklyEvents(processedWeeklyEvents);

        // Generate events for recurring monthly events
        const recurringMonthlyEvents = monthlyEventsResponse.data.flatMap(
          (event) => {
            const dayOfWeek = [
              "SUN",
              "MON",
              "TUE",
              "WED",
              "THU",
              "FRI",
              "SAT",
            ].indexOf(event.day);
            const dates = generateRecurringEventDates(
              new Date(),
              12,
              dayOfWeek,
              event.weekNum
            );
            return dates.map((date) => ({
              ...event,
              date,
            }));
          }
        );
        setOneOffEvents((oneOffEvents) => [
          ...oneOffEvents,
          ...recurringMonthlyEvents,
        ]);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="App">
      <h1>Los Angeles Salsa Events</h1>
      <WeeklyEvents events={weeklyEvents} />
      <EventList events={oneOffEvents} />
    </div>
  );
}

export default App;

//EVENT COMPONENT
function Event({ event }) {
  return (
    <div className="event">
      <div className="event-info">
        <a
          href={event.instagramLink}
          className="event-name"
          target="_blank"
          rel="noopener noreferrer"
        >
          {event.eventName}
        </a>
        <span>
          at{" "}
          <a
            href={event.locationLink}
            className="location"
            target="_blank"
            rel="noopener noreferrer"
          >
            {event.location}
          </a>{" "}
          <span className="start-time">
            ({event.classStartTime}
            {event.classStartTime && event.socialStartTime ? " | " : ""}
            {event.socialStartTime})
          </span>
          <span className="event-cost"> {event.cost}</span>
        </span>
      </div>
    </div>
  );
}

// DAY COMPONENT
function Day({ date, events }) {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  //Format the date title
  const formattedDate = date.toLocaleDateString(undefined, options);

  return (
    <div className="day">
      <p className="date-title">{formattedDate}</p>
      {events.map((event) => (
      <div className="monthly-item">
        <Event key={event.id} event={event} />
      </div>
      ))}
    </div>
  );
}

//EVENTLIST COMPONENT
function EventList({ events }) {
  const eventsByDate = events.reduce((groupedEvents, event) => {
    const dateTitle = event.date.toISOString().split("T")[0]; // Get the date part of the ISO string
    if (!groupedEvents[dateTitle]) {
      groupedEvents[dateTitle] = [];
    }
    groupedEvents[dateTitle].push(event);
    return groupedEvents;
  }, {});

  // Find today's date in Pacific Time
  const today = new Date();
  today.setHours(today.getHours() - today.getTimezoneOffset() / 60 - 7); // Subtract the time zone offset and 7 hours for Pacific Time
  const todayString = today.toISOString().split("T")[0];

  // Filter out previous dates, arrange chronologically
  const eventsByDateArray = Object.entries(eventsByDate);
  let filteredAndSortedEventsByDateArray = eventsByDateArray
    .filter(([date]) => date >= todayString)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="event-list">
      {filteredAndSortedEventsByDateArray.map(([dateString, events]) => {
        const date = new Date(`${dateString}T00:00:00-07:00`); // Append a time component in Pacific Time
        return <Day key={dateString} date={date} events={events} />;
      })}
    </div>
  );
}

// Helper function to generate dates for recurring event
function generateRecurringEventDates(startDate, numMonths, dayOfWeek, weekNum) {
  const dates = [];
  for (let i = 0; i < numMonths; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    while (date.getDay() !== dayOfWeek) {
      date.setDate(date.getDate() + 1);
    }
    date.setDate(date.getDate() + 7 * (weekNum - 1));
    dates.push(new Date(date));
  }
  return dates;
}

//WEEKLYLIST COMPONENT
function WeeklyEvents({ events }) {
  const dayMapping = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
  };

  // Get today's day of the week in PST
  const todayInPST = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  const todayDayOfWeek = new Date(todayInPST).getDay(); // 0 (Sunday) to 6 (Saturday)

  // Adjust dayMapping based on today's day of the week
  const adjustedDayMapping = Object.fromEntries(
    Object.entries(dayMapping).map(([day, num]) => [
      day,
      (num + 7 - todayDayOfWeek) % 7,
    ])
  );

  // Sort by day of the week, from today to the day before today
  let sortedEvents = [...events].sort((a, b) => {
    const dayA = adjustedDayMapping[a.day];
    const dayB = adjustedDayMapping[b.day];
    return dayA - dayB;
  });

  return (
    <div className="weekly-events">
      <p className="weekly-title">WEEKLY</p>
      <div className="event-grid">
        {sortedEvents.map((event) => {
          const isToday = dayMapping[event.day] === todayDayOfWeek;

          return (
            <React.Fragment key={event.id}>
              <div className={`day-of-week ${isToday ? "today" : ""}`}>
                {event.day}
              </div>
              <div className="weekly-item">
                <Event event={event} />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
