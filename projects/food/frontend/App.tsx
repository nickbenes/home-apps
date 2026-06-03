import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import MenuPlanner from './components/MenuPlanner';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import ShoppingListPage from './components/ShoppingList';
import FeatureRequestsPage from './components/FeatureRequests';

export default function App() {
  return (
    <BrowserRouter basename="/food">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/menu" replace />} />
          <Route path="/menu" element={<MenuPlanner />} />
          <Route path="/recipes" element={<RecipeList />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
          <Route path="/requests" element={<FeatureRequestsPage />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
