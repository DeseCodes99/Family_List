export async function api(action, data) {
  const token = document.cookie
    .split("; ")
    .find((v) => v.startsWith("csrftoken="))
    ?.slice(10);
  const response = await fetch(
    "/api/" + action,
    data === void 0
      ? {}
      : {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": token || "",
          },
          body: JSON.stringify(data),
        },
  );
  if (response.status === 401 && action !== "login") location.assign("/login");
  const result = await response
    .json()
    .catch(() => ({
      error: "The request failed. Refresh the page and try again.",
    }));
  if (!response.ok) throw new Error(result.error || "Please try again.");
  return result;
}
