import { Body, Container, Head, Heading, Html, Text } from '@react-email/components';


export function WelcomeEmail(): React.JSX.Element {
  return (
    <Html lang="en">
      <Head />
      <Body
        style={{
          backgroundColor: '#f4f7fb',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <Container style={{ margin: '0 auto', padding: '40px 24px' }}>
          <Heading>TutorAI</Heading>
          <Text>
            This workspace is ready for the next foundation tasks: auth, upload,
            document records, and processing status.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
