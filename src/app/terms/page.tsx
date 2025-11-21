
// Placeholder page for Terms of Service
export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
      <div className="prose prose-lg max-w-none text-muted-foreground">
        <p>Welcome to LISTED!</p>
        <p>These terms and conditions outline the rules and regulations for the use of LISTED's Website, located at [YourWebsiteURL.com].</p>
        <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use LISTED if you do not agree to take all of the terms and conditions stated on this page.</p>
        
        <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">Cookies</h2>
        <p>We employ the use of cookies. By accessing LISTED, you agreed to use cookies in agreement with the LISTED's Privacy Policy.</p>
        <p>Most interactive websites use cookies to let us retrieve the user’s details for each visit. Cookies are used by our website to enable the functionality of certain areas to make it easier for people visiting our website. Some of our affiliate/advertising partners may also use cookies.</p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-2">License</h2>
        <p>Unless otherwise stated, LISTED and/or its licensors own the intellectual property rights for all material on LISTED. All intellectual property rights are reserved. You may access this from LISTED for your own personal use subjected to restrictions set in these terms and conditions.</p>
        <p>You must not:</p>
        <ul>
            <li>Republish material from LISTED</li>
            <li>Sell, rent or sub-license material from LISTED</li>
            <li>Reproduce, duplicate or copy material from LISTED</li>
            <li>Redistribute content from LISTED</li>
        </ul>

        <p>This Agreement shall begin on the date hereof.</p>

        {/* Add more sections as needed: User Accounts, Content Liability, Disclaimer, etc. */}
        <p className="mt-10"><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
        <p>Please consult with a legal professional to create comprehensive and legally sound Terms of Service for your specific platform.</p>
      </div>
    </div>
  );
}
