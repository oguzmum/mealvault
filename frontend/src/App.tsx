import { Route, Routes } from "react-router-dom";

import Layout from "./components/layout/Layout";
import BasicsPage from "./pages/BasicsPage";
import DishDetailPage from "./pages/DishDetailPage";
import DishesPage from "./pages/DishesPage";
import DishFormPage from "./pages/DishFormPage";
import MealDbImportPage from "./pages/MealDbImportPage";
import NotFoundPage from "./pages/NotFoundPage";
import PlanPage from "./pages/PlanPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import ShoppingPage from "./pages/ShoppingPage";
import WheelPage from "./pages/WheelPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PlanPage />} />
        <Route path="dishes" element={<DishesPage />} />
        <Route path="dishes/new" element={<DishFormPage />} />
        <Route path="dishes/import-mealdb" element={<MealDbImportPage />} />
        <Route path="dishes/:id" element={<DishDetailPage />} />
        <Route path="dishes/:id/edit" element={<DishFormPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="shopping" element={<ShoppingPage />} />
        <Route path="wheel" element={<WheelPage />} />
        <Route path="basics" element={<BasicsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
