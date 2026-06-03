import { Overlay, Center, Stack, Title, Text, Button, Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Ending } from '@earth-alliance/engine';

const KIND_COLOR: Record<Ending['kind'], string> = { win: 'teal', loss: 'red', ambiguous: 'yellow' };

interface EndingScreenProps {
  ending: Ending;
  year: number;
  onPlayAgain(): void;
}

export function EndingScreen({ ending, year, onPlayAgain }: EndingScreenProps) {
  return (
    <Overlay color="#000" backgroundOpacity={0.85} fixed zIndex={1000}>
      <Center h="100%">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Stack align="center" gap="md" maw={520} p="xl">
            <Badge size="lg" color={KIND_COLOR[ending.kind]}>{ending.kind.toUpperCase()}</Badge>
            <Title order={1} ta="center">{ending.title}</Title>
            <Text ta="center" c="dimmed">Year {year}</Text>
            <Text ta="center">{ending.description}</Text>
            <Button size="lg" onClick={onPlayAgain}>Play again</Button>
          </Stack>
        </motion.div>
      </Center>
    </Overlay>
  );
}
