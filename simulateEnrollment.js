
const simulateEnrollment = async () => {
  const curso_id = "clx0201000000080808080808"; // Replace with a valid curso_id from your database
  const student_email = "test@example.com"; // Simulate an unauthenticated user
  const nombre = "Test"; // Required for unauthenticated enrollment
  const apellido = "User"; // Required for unauthenticated enrollment

  try {
    const response = await fetch("http://localhost:3000/api/alumno/inscripcion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `student_email=${student_email}`,
      },
      body: JSON.stringify({ curso_id, nombre, apellido }),
    });

    if (response.ok) {
      console.log("Enrollment simulated successfully!");
      const data = await response.json();
      console.log("Response:", data);
    } else {
      console.error("Failed to simulate enrollment:", response.status, response.statusText);
      const errorData = await response.text();
      console.error("Error details:", errorData);
    }
  } catch (error) {
    console.error("Error during enrollment simulation:", error);
  }
};

simulateEnrollment();
