import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import MenuPlanner from './components/MenuPlanner';
import RecipeList from './components/RecipeList';
import ShoppingListPage from './components/ShoppingList';

export default function App() {
  return (
    <BrowserRouter basename="/food">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/menu" replace />} />
          <Route path="/menu" element={<MenuPlanner />} />
          <Route path="/recipes" element={<RecipeList />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
