const SURVEYS_KEY = 'olea_surveys_db';

const initialSurveys = [
  {
    id: "SURV-001",
    title: "Clima Laboral Q1 2026",
    description: "Queremos conocer tu opinión sobre el ambiente de trabajo y las herramientas proporcionadas.",
    status: "ACTIVE", // [DRAFT, ACTIVE, CLOSED]
    anonymous: true,
    endDate: "2026-03-15",
    questions: [
      { id: 1, type: "RATING", text: "¿Qué tan satisfecho te sientes con tu equipo de trabajo?", min: 1, max: 5 },
      { id: 2, type: "RATING", text: "¿Consideras que las herramientas de campo (EPP, Apps) son adecuadas?", min: 1, max: 5 },
      { id: 3, type: "TEXT", text: "¿Qué una cosa cambiarías para mejorar tu día a día?" }
    ],
    responsesCount: 12
  }
];

export const surveyService = {
  async getAll() {
    const data = localStorage.getItem(SURVEYS_KEY);
    return data ? JSON.parse(data) : initialSurveys;
  },

  async save(survey) {
    const surveys = await this.getAll();
    const newSurvey = { 
      ...survey, 
      id: `SURV-${Math.floor(100 + Math.random() * 900)}`,
      responsesCount: 0 
    };
    localStorage.setItem(SURVEYS_KEY, JSON.stringify([...surveys, newSurvey]));
    return newSurvey;
  }
};
