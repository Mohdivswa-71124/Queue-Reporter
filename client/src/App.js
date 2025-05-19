import React, { useState, useEffect } from "react";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ Helper to show "x minutes ago"
function getTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute(s) ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour(s) ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day(s) ago`;
}

function App() {
  const [location, setLocation] = useState("Fetching...");
  const [minutes, setMinutes] = useState("");
  const [rationId, setRationId] = useState("");
  const [queues, setQueues] = useState([]);
  const [reportDate, setReportDate] = useState("");
  const [lastUpdated, setLastUpdated] = useState(""); // ✅ Last updated state

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            const address = data.display_name
              ?.split(",")
              .slice(0, 3)
              .join(", ") || `${latitude}, ${longitude}`;
            setLocation(address);
          } catch (err) {
            console.error("Reverse geocoding failed:", err);
            setLocation(`${latitude}, ${longitude}`);
          }
        },
        () => setLocation("Location access denied")
      );
    } else {
      setLocation("Geolocation not supported");
    }

    const now = new Date();
    setMinutes(now.toTimeString().substring(0, 5));
    const today = new Date().toISOString().split("T")[0];
    setReportDate(today);

    fetchQueues();
  }, []);

  // ✅ Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueues();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueues = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/api/queues");
      const data = await res.json();
      setQueues(data);
      setLastUpdated(new Date().toLocaleTimeString()); // ✅ update time
    } catch (err) {
      console.error("Failed to fetch queues:", err);
      toast.error("❌ Could not load queue data.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://127.0.0.1:5000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          minutes,
          category: rationId,
          date: reportDate,
        }),
      });

      if (res.ok) {
        toast.success("✅ Report submitted successfully!");
        setRationId("");
        fetchQueues();
      } else {
        toast.error("❌ Failed to submit report. Try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("⚠️ Network error. Could not submit report.");
    }
  };

  const nowTime = new Date().toTimeString().substring(0, 5);

  return (
    <div className="app-container">
      <h1>Queue Reporter</h1>

      <form className="queue-form" onSubmit={handleSubmit}>
        <label>
          📍 Location (auto-detected):
          <input value={location} readOnly />
        </label>

        <label>
          🕒 Expected Wait Time (HH:MM):
          <input
            type="time"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            min={nowTime}
            required
          />
        </label>

        <label>
          Name or ID:
          <input
            value={rationId}
            onChange={(e) => setRationId(e.target.value)}
            placeholder="Name or Card Number"
            required
          />
        </label>

        <label>
          🗓️ Date:
          <input type="date" value={reportDate} readOnly />
        </label>

        <button type="submit">📤 Submit Report</button>
      </form>

      <h2>📊 Submitted Reports</h2>
      <p style={{ fontStyle: "italic", color: "#555", marginTop: "-10px" }}>
        Last updated: {lastUpdated}
      </p>

      <div className="queue-list">
        {queues.length === 0 ? (
          <p>No reports yet</p>
        ) : (
          queues.map((q, index) => (
            <div className="queue-card" key={index}>
              <h3>{q.location}</h3>
              <p>Reported By: {q["Reported Name"] ?? "Anonymous"}</p>
              <p>Expected Wait: <strong>{q.minutes}</strong></p>
              <p>Report: {q.report ?? "N/A"}</p>
              <p>Date: {q.date ?? "N/A"}</p>
              <p>🕒 Reported: {getTimeAgo(q.timestamp)}</p>
            </div>
          ))
        )}
      </div>

      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
}

export default App;
