import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  // Removes the authentication token and returns the user to login.
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Digital Wallet</h1>
          <p>
            Welcome, {user?.name || "User"}
          </p>
        </div>

        <button onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="dashboard-content">
        <section className="welcome-card">
          <h2>Dashboard</h2>

          <p>
            Manage your wallet, expenses and group payments.
          </p>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Wallet</h3>
            <p>View your wallet balance.</p>
            <button>View Wallet</button>
          </div>

          <div className="dashboard-card">
            <h3>Groups</h3>
            <p>Manage your expense groups.</p>
            <button>View Groups</button>
          </div>

          <div className="dashboard-card">
            <h3>Expenses</h3>
            <p>Track your personal and group expenses.</p>
            <button>View Expenses</button>
          </div>

          <div className="dashboard-card">
            <h3>Transactions</h3>
            <p>View your wallet transactions.</p>
            <button>View Transactions</button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;