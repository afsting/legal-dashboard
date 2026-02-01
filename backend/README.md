# Legal Dashboard Backend

Node.js/Express backend with JWT authentication and AWS integration (via LocalStack).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Start LocalStack (from project root):
```bash
docker-compose up -d
```

4. Initialize LocalStack (creates DynamoDB tables and S3 buckets):
```bash
npm run init-localstack
```

5. Start the backend:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Protected Routes
- `GET /api/protected` - Example protected route (requires JWT token)

## Environment Variables

See `.env.example` for all available configuration options.

## Project Structure

```
src/
├── server.js           # Main Express app
├── config/
│   └── aws.js         # AWS/LocalStack configuration
├── middleware/
│   └── auth.js        # JWT authentication middleware
├── routes/
│   ├── auth.js        # Authentication endpoints
│   └── ...            # Other route files
├── controllers/       # Business logic
└── models/           # Database models

scripts/
└── init-localstack.js # Initialize LocalStack resources
```
