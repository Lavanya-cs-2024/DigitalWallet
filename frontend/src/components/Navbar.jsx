import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  // Removes the stored login information and logs the user out.
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <nav className="navbar">
      <h2 onClick={() => navigate("/dashboard")}>
        Digital Wallet
      </h2>

      <div className="nav-links">
        <button onClick={() => navigate("/dashboard")}>
          Dashboard
        </button>

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;