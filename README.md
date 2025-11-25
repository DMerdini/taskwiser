# Firebase Studio

This is a NextJS starter in Firebase Studio.

## Getting Started Locally

To run this project on your local machine, follow these steps:

### 1. Install Dependencies

First, you need to install the necessary Node.js packages. Open your terminal in the project's root directory and run one of the following commands, depending on your preferred package manager:

```bash
npm install
```
or
```bash
yarn install
```
or
```bash
pnpm install
```

### 2. Set Up Environment Variables

This project uses reCAPTCHA, which requires API keys. You'll need to create a `.env.local` file in the root of your project and add your keys.

1.  Create the file:
    ```bash
        touch .env.local
            ```

            2.  Add the following variables to `.env.local`, replacing the placeholder values with your actual reCAPTCHA keys from the Google Cloud Console:

                ```
                    NEXT_PUBLIC_RECAPTCHA_SITE_KEY=YOUR_RECAPTCHA_SITE_KEY
                        RECAPTCHA_SECRET_KEY=YOUR_RECAPTCHA_SECRET_KEY
                            ```

                            ### 3. Run the Development Server

                            Once the dependencies are installed and your environment variables are set, you can start the Next.js development server:

                            ```bash
                            npm run dev
                            ```

                            The application will start, and you can view it in your browser at [http://localhost:9002](http://localhost:9002). The server will automatically reload when you make changes to the code.

                            ### 4. Build for Production

                            When you're ready to create a production build of your application, you can run:

                            ```bash
                            npm run build
                            ```

                            This will create an optimized build in the `.next` folder. You can then start the production server with:

                            ```bash
                            npm run start
                            ```
                            