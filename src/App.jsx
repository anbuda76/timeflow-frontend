import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Timesheet from './pages/Timesheet';
import Users from './pages/Users';
import Projects from './pages/Projects';
import Approvals from './pages/Approvals';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PrivateRoute from './components/PrivateRoute';
import Organizations from './pages/Organizations';
import Calendar from './pages/Calendar';
import WeekendAuthorizations from './pages/WeekendAuthorizations';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/timesheet" element={
          <PrivateRoute roles={['admin', 'super_admin', 'manager', 'employee']}>
            <Timesheet />
          </PrivateRoute>
        } />
        <Route path="/users" element={
          <PrivateRoute roles={['admin', 'super_admin', 'manager']}>
            <Users />
          </PrivateRoute>
        } />
        <Route path="/projects" element={
          <PrivateRoute roles={['admin', 'super_admin']}>
            <Projects />
          </PrivateRoute>
        } />
	<Route path="/organizations" element={
  	  <PrivateRoute roles={['super_admin']}>
    	   <Organizations />
  	  </PrivateRoute>
	} />
        <Route path="/approvals" element={
          <PrivateRoute roles={['admin', 'super_admin', 'manager']}>
            <Approvals />
          </PrivateRoute>
        } />
        <Route path="/reports" element={
          <PrivateRoute roles={['admin', 'super_admin']}>
            <Reports />
          </PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute roles={['admin', 'super_admin']}>
            <Settings />
          </PrivateRoute>
        } />
	<Route path="/calendar" element={
  	 <PrivateRoute roles={['admin', 'super_admin']}>
    	   <Calendar />
  	</PrivateRoute>
	} />
        <Route path="/weekend-authorizations" element={
          <PrivateRoute roles={['admin', 'super_admin']}>
            <WeekendAuthorizations />
          </PrivateRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}