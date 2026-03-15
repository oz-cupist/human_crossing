import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Human Crossing API",
      version: "1.0.0",
      description: "Human Crossing 게임 서버 REST API 문서",
    },
    servers: [
      {
        url: "http://localhost:2567",
        description: "로컬 개발 서버",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
