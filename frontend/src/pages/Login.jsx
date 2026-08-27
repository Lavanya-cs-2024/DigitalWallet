import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  // Updates the login form values.
  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  // Sends login credentials to the backend.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    try {
      const response = await api.post("/auth/login", formData);

      // Saves the authentication token for future API requests.
      localStorage.setItem("token", response.data.token);

      // Saves basic user information for the frontend.
      if (response.data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(response.data.user)
        );
      }

      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Invalid email or password."
      );
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Digital Wallet</h1>

        <p className="subtitle">
          Login to your account
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          {error && <p className="error">{error}</p>}

          <button type="submit">Login</button>
        </form>

        <p className="switch-page">
          Don't have an account?{" "}
          <button onClick={() => navigate("/register")}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;