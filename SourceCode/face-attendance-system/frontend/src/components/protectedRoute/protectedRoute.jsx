import { Navigate } from "react-router-dom";
import { getToken, isTokenExpired } from "../../utils/auth";

function ProtectedRoute({ children }) {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token");
    
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
