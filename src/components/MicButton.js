import React from "react";
import { FaPhoneAlt, FaPhoneSlash } from "react-icons/fa"; // Import call pickup and cut icons
import '../styles/App.css';

const MicButton = ({ isRecording, onClick }) => {
  return (
    <button
      className={`mic-button ${isRecording ? "recording" : ""}`}
      onClick={onClick}
    >
      {isRecording ? <FaPhoneSlash /> : <FaPhoneAlt />} {/* Conditional icon rendering */}
      <span>{isRecording ? "" : ""}</span>
    </button>
  );
};

export default MicButton;