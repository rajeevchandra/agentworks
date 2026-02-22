use anyhow::Result;
use keyring::Entry;

const SERVICE_NAME: &str = "OneDriveSummarizer";
const TOKEN_KEY: &str = "access_token";

pub fn store_token(token: &str) -> Result<()> {
    let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)?;
    entry.set_password(token)?;
    Ok(())
}

pub fn get_token() -> Result<String> {
    let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)?;
    let token = entry.get_password()?;
    Ok(token)
}

pub fn delete_token() -> Result<()> {
    let entry = Entry::new(SERVICE_NAME, TOKEN_KEY)?;
    entry.delete_password()?;
    Ok(())
}

pub fn has_token() -> bool {
    get_token().is_ok()
}
