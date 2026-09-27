try {
  document.documentElement.classList.toggle(
    "dark",
    localStorage.getItem("theme") !== "light",
  );
} catch {
  document.documentElement.classList.add("dark");
}
