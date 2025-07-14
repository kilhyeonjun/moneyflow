-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateFunction: UUID v7 generation function
CREATE OR REPLACE FUNCTION gen_random_uuid_v7()
RETURNS UUID AS $$
DECLARE
    -- Get current timestamp in milliseconds since Unix epoch
    unix_ts_ms BIGINT;
    -- Random bytes for the rest of the UUID
    rand_bytes BYTEA;
    -- Final UUID components
    time_hi INTEGER;
    time_mid INTEGER;
    time_low INTEGER;
    clock_seq INTEGER;
    node BIGINT;
BEGIN
    -- Get current timestamp in milliseconds
    unix_ts_ms := EXTRACT(EPOCH FROM NOW()) * 1000;
    
    -- Generate 10 random bytes
    rand_bytes := gen_random_bytes(10);
    
    -- Extract timestamp components (48 bits total)
    time_hi := (unix_ts_ms >> 16) & 4294967295; -- Upper 32 bits
    time_mid := unix_ts_ms & 65535;             -- Lower 16 bits
    
    -- Version (4 bits) + random (12 bits)
    time_low := 28672 | (get_byte(rand_bytes, 0) << 8) | get_byte(rand_bytes, 1); -- 0x7000 | random
    
    -- Variant (2 bits) + random (14 bits)  
    clock_seq := 32768 | ((get_byte(rand_bytes, 2) << 8) | get_byte(rand_bytes, 3)) & 16383; -- 0x8000 | random
    
    -- Node (48 bits of random data)
    node := (get_byte(rand_bytes, 4)::BIGINT << 40) |
            (get_byte(rand_bytes, 5)::BIGINT << 32) |
            (get_byte(rand_bytes, 6)::BIGINT << 24) |
            (get_byte(rand_bytes, 7)::BIGINT << 16) |
            (get_byte(rand_bytes, 8)::BIGINT << 8) |
            get_byte(rand_bytes, 9)::BIGINT;
    
    -- Construct and return the UUID
    RETURN (
        LPAD(TO_HEX(time_hi), 8, '0') || '-' ||
        LPAD(TO_HEX(time_mid), 4, '0') || '-' ||
        LPAD(TO_HEX(time_low), 4, '0') || '-' ||
        LPAD(TO_HEX(clock_seq), 4, '0') || '-' ||
        LPAD(TO_HEX(node), 12, '0')
    )::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- CreateFunction: UUID v7 timestamp extraction function
CREATE OR REPLACE FUNCTION uuid_v7_to_timestamp(uuid_v7 UUID)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    hex_string TEXT;
    timestamp_ms BIGINT;
BEGIN
    -- Convert UUID to hex string and extract first 12 characters (48 bits)
    hex_string := REPLACE(uuid_v7::TEXT, '-', '');
    hex_string := SUBSTRING(hex_string, 1, 12);
    
    -- Convert hex to timestamp in milliseconds
    timestamp_ms := ('x' || hex_string)::BIT(48)::BIGINT;
    
    -- Convert to timestamp
    RETURN TO_TIMESTAMP(timestamp_ms / 1000.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comments
COMMENT ON FUNCTION gen_random_uuid_v7() IS 'Generates UUID v7 (time-ordered UUID) for better database performance and debugging';
COMMENT ON FUNCTION uuid_v7_to_timestamp(UUID) IS 'Extracts timestamp from UUID v7 for debugging and analysis';
