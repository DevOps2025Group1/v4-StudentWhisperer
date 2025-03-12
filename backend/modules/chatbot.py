"""
Chatbot application for University of Amsterdam students using OpenAI and Azure Search.
"""

from clients.search_client import AzureSearchClient
from clients.openai_client import OpenAIClient
from clients.database_client import DatabaseClient


class OpenAIChatbot:
    """Chatbot interface using Streamlit and Azure APIs."""

    def __init__(self):
        self.openai_client = OpenAIClient()
        self.search_client = AzureSearchClient()
        self.database_client = DatabaseClient()
        self.system_prompt = {
            "role": "system",
            "content": (
                "You are an AI assistant designed to help students from the University of Amsterdam. "
                "Provide clear and concise answers based solely on the information provided in the conversation "
                "and documents. Do not provide false information or content not mentioned in the documents. "
                "Use relevant knowledge when needed. Avoid mentioning that your information comes from the documents."
            ),
        }

    def generate_response(self, prompt: str, user_email: str) -> str:
        """Generate a response for the given prompt."""
        # Retrieve student information
        student = self.database_client.get_student_info(user_email)
        print(user_email, flush= True)
        print(student, flush= True)
        student_context = (
            f"Student Information:\n"
            f"- Name: {student.name}\n"
            f"- Email: {student.email}\n"
            f"- Courses and Grades:\n"
        )

        for course in student.courses:
            student_context += (
                f"  - {course['course_name']}: {course['grade']}\n"
            )

        # Search for relevant context
        search_results = self.search_client.search_documents(prompt)
        context_message = (
            {
                "role": "system",
                "content": f"{student_context}\nRelevant information from search:\n{search_results}",
            }
            if search_results.strip()
            else None
        )

        # Build messages list with system prompt
        messages_with_context = [self.system_prompt]
        if context_message:
            messages_with_context.append(context_message)
        messages_with_context.append({"role": "user", "content": prompt})

        # Generate response using OpenAI API
        response = self.openai_client.generate_response(messages_with_context)
        return response